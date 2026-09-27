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
| follow-up message present | yes | ✅ |
| no `[FOLLOWUP]`/`[SEVERITY]` tag leakage | none | ✅ |
| `locator` routes (hospital/pharmacy nearby) | yes | ✅ |
| `diagnosis` routes (what condition do I have) | yes | ✅ |
| Darija in → Darija out | yes | ✅ |

Both gateway directions matter: a gateway that always reports emergency passes the first
row and is broken.

**These tests are rate-limit sensitive.** An earlier run scored 8/12 with the same code —
Groq's output-tokens-per-minute budget was exhausted by the test burst itself, the router
429'd, and every request silently fell back to `triage`. That is what surfaced the missing
retry. Paced ~5s apart, they pass. See `MIGRATION-NOTES.md`.

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
the app compiles for Android. No device or emulator needed for this proof.

All 11 endpoints the mobile app calls resolve against mounted backend routes
(`/auth/*`, `/chat/*`, `/profile*`, `/medications/check`, `/orchestrator/*`,
`/pregnancy/check`).

`mobile/.env` needed setting: upstream hardcoded `192.168.1.58`, this host is
`192.168.1.91`. Confirmed the backend is reachable on the LAN (401 = correct).

## Not verified

- **On-device**: no Android emulator or physical phone here, so screens were not
  visually confirmed. The bundle compiles and every endpoint resolves; the UI itself is
  untested on a real device.
- **Push notifications / fall detection** need a native dev build, not Expo Go.
- **Streaming**: not implemented (no SSE route).
- **n8n emergency workflow**: copied, unwired.
