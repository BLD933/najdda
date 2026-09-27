# Test results

Run 2026-09-27. Backend on :5000, Postgres in docker `shifaa-db`, provider Groq.

## Backend — 12/12 pass

| Check | Expected | Got |
| :--- | :--- | :--- |
| Darija chest pain → emergency | `true` | ✅ |
| Morocco emergency number | `150` | ✅ |
| That detection is real, not fail-safe | no fail-safe text | ✅ |
| Mild rash → not emergency | `false` | ✅ |
| Orchestrator chest pain → emergency | `true` | ✅ |
| Orchestrator emergency number | `150` | ✅ |
| Arabic routine → not emergency | `false` | ✅ |
| `تابعني بعد 10 ثواني` → timer | `0.1667` min | ✅ |
| no `[FOLLOWUP]`/`[SEVERITY]` tag leakage | none | ✅ |
| `locator` routes (hospital/pharmacy nearby) | yes | ✅ |
| locator output is prose, not raw JSON | yes | ✅ |
| `diagnosis` routes (what condition do I have) | yes | ✅ |
| diagnosis output is prose, not raw JSON | yes | ✅ |

Both gateway directions matter: a gateway that always reports emergency passes the first
row and is broken.

**These tests are rate-limit sensitive.** An earlier run scored 8/12 with the same code —
Groq's output-tokens-per-minute budget was exhausted by the test burst itself, the router
429'd, and every request silently fell back to `triage`. That is what surfaced the missing
retry. Paced ~5s apart, they pass. See `MIGRATION-NOTES.md`.

**One flaky input.** `keno mektab les reaffaississements dyal sara?` (Darija, slightly
ambiguous) intermittently makes the model answer with a clarifying question instead of JSON,
returning `json_validate_failed`. Re-running succeeds. The model behaviour, not a code
defect — but it degrades to `triage`, which is the intended safe fallback.

## Provider swap — proven, zero code change

Same `LlmClient`, same call, env switched:

| Provider | Model | Result |
| :--- | :--- | :--- |
| Groq | `qwen/qwen3.8-27b` | ✅ ~7ms |
| Ollama (local) | `gemma4:4b` | ✅ but **18s** — no GPU on this box |

Switching was only `cp .env.preset.ollama .env` plus a restart.

## Multimodal / vision

`POST /api/chat/vision` with a 64×64 PNG → **200**, model correctly described the image
(blank beige square) in French to match the prompt language. A 1×1 PNG was correctly
rejected by the provider with "Image must have at least 32 pixels" — the path reaches the
model and surfaces real errors.

## Web app (Chromium, :5173)

Login → 5-step profile wizard → dashboard → chat, all with live data:

- Real Moroccan drug formulary (`DOLIPRANE COMPRIME SECABLE`, 5 variants) from
  `medicament-api.vercel.app`
- Real Casablanca hospitals from Google Places
- Profile persisted: O+, BMI 23.7, hypertension, Doliprane, hospital
- `PUT /api/profile` → 200, confirmed in Postgres
- Chat: Arabic RTL, French, Darija; multi-agent chips (`TRIAGE`, `PHARMACY`);
  emergency badge; history loads from Postgres on mount

**Built during this pass:** the chat did not exist. `ChatPage.jsx` is new; the dashboard's
"Symptom Triage" and "Emergency SOS" buttons had no `onClick` at all. Also fixed two
cosmetic placeholders ("00/00/0000", "GPS OFFLINE").

## Android app (Expo 54, Metro :8081)

Production Android bundle: **HTTP 200, 11,451,244 bytes**. That is a real full bundle —
the app compiles for Android.

All 11 endpoints the mobile app calls resolve against mounted backend routes
(`/auth/*`, `/chat/*`, `/profile*`, `/medications/check`, `/orchestrator/*`,
`/pregnancy/check`).

`mobile/.env` needed setting: upstream hardcoded `192.168.1.58`, this host is
`192.168.1.91`.

## On-device (Samsung SM-A037G, Android 13, 720×1600 @ 300dpi)

Installed through **Expo Go** over adb, with both tunnels reversed over USB rather than the
LAN:

```
adb reverse tcp:8081 tcp:8081   # Metro
adb reverse tcp:5000 tcp:5000   # backend
adb shell am start -a android.intent.action.VIEW -d "exp://127.0.0.1:8081" host.exp.exponent
```

| Step | Result |
| :--- | :--- |
| Expo Go loads the bundle | ✅ no red screen |
| `GET /api/auth/me` → 200, session survives a full app restart | ✅ "Hello, Test 👋" |
| Dashboard renders live vitals | ✅ |
| Symptom Triage loads chat history from Postgres | ✅ Arabic exchanges |
| SSE send path (`POST /chat/message`, `text/event-stream`) | ✅ reply renders, `agentsUsed: ['triage']` |
| Orchestrator round trip | ✅ see below |

**Orchestrator exchange, captured on the phone.** Sent `notice`; the router declined to
activate a medical specialist and answered in the patient's language instead of falling
through to a generic English template:

> Salam! 👋 I am the NAJDDA Orchestrator.
> مرحباً بك، كيف حالك اليوم؟  _(tagged `Triage`)_

Both rows are in `chat_messages` (11:02:21 user, 11:02:22 assistant), so the exchange
persisted server-side, not just rendered.

### Streaming is implemented, and the missing link was the agent

`ChatService.sendMessageStream` called `triageAgent.streamAssess()`, which did not exist —
`TriageAgent` only had `assess()`. The generator now exists, so the SSE route
(`/api/chat/message` with `stream: true` → `Content-Type: text/event-stream`,
`data: {json}\n\n` frames) completes instead of dying at the controller. The client parses
both shapes: an `application/json` body for the non-stream path, the frame reader for SSE.

**`ponytail:` — this is not true token streaming.** `streamAssess` awaits the whole
`assess()` result and emits it as one token, because the triage schema has to parse before
any of it can be shown. Swap the body for `llmClient.completeStream` once the UI tolerates
partial JSON. The `completeStream` SSE parser itself is already written and used.

### Two fixes made from real device traffic

**Stochastic `json_validate_failed` retried.** A 400 `Failed to generate JSON` reached a
patient's chat bubble verbatim — provider internals including the `failed_generation` body.
Roughly 1 in 12 calls: the model answered in Arabic prose without wrapping it in the
requested object, and Groq's `json_object` validator rejected it. The request was valid, so
`LlmClient.complete` now retries it via a generalized `isRetryable` predicate on
`withRateLimitRetry` (400 ms base delay).

**Provider errors no longer reach a patient.** The client-side error callback in `triage.js`
now renders a fixed Arabic message plus the emergency number (150) and `console.warn`s the
raw detail. Logging a patient's symptoms to a console is fine; printing a vendor's stack at
a patient is not.

## Not verified

- **Push notifications / fall detection** need a native dev build, not Expo Go.
- **n8n emergency workflow**: copied, unwired.
- **Only one device model** (SM-A037G) and only over the adb tunnel. The LAN path
  (`192.168.1.91`) was confirmed reachable but not exercised through the UI.
