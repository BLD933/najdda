# NAJDDA — what this is and how to run it

Multi-agent medical orchestrator. Upstream project is `zoubaax/gemma-hackathon` (which
called itself SHIFAA, local Ollama + Gemma 4). Everything here is that codebase, ported
to a **provider-agnostic LLM layer** and wired into a working web + mobile app.

Upstream commit: `31ece8b` (also in `.upstream-commit`).

## Run all three

```bash
docker start shifaa-db          # Postgres 17 on :5433

cd backend  && npm run dev      # :5000  API
cd frontend && npm run dev      # :5173  web
cd mobile   && npx expo start   # :8081  Android / iOS
```

`backend/.env`, `mobile/.env` are gitignored and populated. `frontend` has no env file —
it defaults to `http://localhost:5000/api` via `VITE_API_URL`.

For a physical phone, `mobile/.env` must use this machine's **LAN IP**, not localhost.

## The LLM layer is plug-and-play

`backend/src/core/lib/LlmClient.js` talks to any OpenAI-compatible `/chat/completions`
endpoint. Swap provider by copying a preset over `.env` — no code change:

```bash
cp backend/.env.preset.groq   backend/.env   # default, ~1000 req/min
cp backend/.env.preset.gemini backend/.env   # 20 req/day free
cp backend/.env.preset.ollama backend/.env   # unlimited, offline, slow on CPU
```

| Variable | Meaning |
| :--- | :--- |
| `LLM_API_KEY` | provider key |
| `LLM_BASE_URL` | full chat-completions URL |
| `LLM_MODEL_FAST` | routing, safety gateway, triage |
| `LLM_MODEL_DEEP` | synthesis |
| `LLM_EXTRA_BODY` | provider-specific fields, JSON, passed through verbatim |

`LLM_EXTRA_BODY` exists so provider quirks are config, not code. Gemini needs
`{"thinkingConfig":{"thinkingBudget":0}}` there; everything else leaves it empty.

Measured on this box: Groq `qwen/qwen3.8-27b` ~7ms, `openai/gpt-oss-120b` for synthesis.
Local `gemma4:4b` works but is ~5.7s per reply (no NVIDIA GPU, Intel UHD 620 only).

## Three things that will bite you

**1. JSON mode is load-bearing, and it fails silently.**
The safety gateway and router both parse JSON and fall back on failure — and the gateway's
fallback is `danger_vital: true`. So a broken JSON path doesn't crash, it silently makes
every message an emergency. Two provider quirks are absorbed in `_buildResponseFormat` and
`_ensureJsonWord`: `json_schema` is downgraded to `json_object` (Groq rejects it on some
models), and the word "json" is injected into the prompt (Groq 400s without it). Don't
remove those without re-testing both.

**2. `gemini-2.5-pro` returns 404 for new projects** — "no longer available to new users".
`NAjdda-README.md` still names it. If you switch to the Gemini preset, use
`gemini-2.5-flash` for both models. Free tier is 20 req/day, and a NAJDDA message costs
~4 calls, so ~5 messages/day. Groq is the default for exactly this reason.

**3. The emergency fail-safe fires on any upstream error**, including quota exhaustion.
If every reply suddenly says "emergency" with no real symptom, check the logs for 429s
before suspecting the model.

## Bugs fixed during the port

All pre-existing upstream, surfaced by testing:

- **`pythonExecutor.js` crashed the process** on a failed `spawn` — no `error` listener, so
  a missing skill script raised an unhandled exception the caller's `try/catch` could not
  catch. Took down `/api/medications/check` entirely.
- **`ChildSafetyService` / `PregnancySafetyService` threw `ReferenceError` on every call** —
  each imported the client under one name and called it under another.
- **`database/index.js` hardcoded `ssl: {rejectUnauthorized: false}`**, assuming Neon. Any
  non-TLS Postgres failed to connect. Now driven by `DATABASE_SSL`.
- **5 services passed `model: 'llama-3.2-11b-vision-preview'`** — a Groq-only name Gemini
  has never heard of. Removed; both models are multimodal.
- **Router returned `selected_agents` instead of `agents`**, so every request silently
  collapsed to `['triage']`. The prompt now names the keys explicitly.
- **`agentNodes.triageNode` passed history through unvalidated** — one entry missing `role`
  makes the provider 400 the whole request. Now filtered.
- **No retry on provider rate limits.** A 429 in the router fell through to its
  `['triage']` default, so a busy minute made the app look like it was working while
  ignoring most messages. In the safety gateway the same 429 hits the fail-safe and
  reports every message as a life-threatening emergency. `LlmClient.withRateLimitRetry()`
  now backs off and retries; both call sites use it.
- **`/orchestrator/chat` never returned `emergencyNumber`**, though the mobile client
  dials it. Patients in Morocco were offered `112` instead of `150`.

## Known gaps

- **Streaming is not implemented.** `LlmClient.completeStream()` works, but no route uses
  it. `NAjdda-README.md` claims SSE. `ChatService.sendMessageStream` calls a
  `streamAssess` that does not exist on TriageAgent.
- **`emergencyMiddleware` does not guard `/api/orchestrator/chat`** — only the five
  `/check` and `/message` routes. The orchestrator catches emergencies downstream via
  triage severity. Both paths verified. Left as-is; the README implies otherwise.
- **Diagnosis, Report, Followup, Locator** are now wired into `AGENT_MAP` and routable
  (they were dead code upstream). The router prompt tells it to pick them only on an
  explicit request, and defaults to `triage` otherwise. `diagnosis` runs in parallel with
  the other nodes, so it re-derives context from the message and profile rather than
  reading triage's output.
- **Medication drug-interaction data** comes from OpenFDA + RxNav, both public APIs with
  no key. The `drug-interaction-checker` Python skill is excluded from the sparse checkout
  and degrades gracefully to `null`.
- Free-tier prompts are used to improve the provider's products. The original project was
  privacy-first by design — demo traffic only until that is resolved deliberately.
