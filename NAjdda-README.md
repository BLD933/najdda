# NAJDDA — Multi-Agent Medical Orchestrator Platform 🏥

> *The AI Hospital That Fits in Your Pocket.*

[![Powered by Gemini](https://img.shields.io/badge/Powered_by-Gemini_2.5_Flash_%2B_Pro-4285F4)](https://aistudio.google.com)
[![Orchestrator](https://img.shields.io/badge/Orchestrator-LangGraph-6C5CE7)](https://langchain-ai.github.io/langgraph/)
[![Stack](https://img.shields.io/badge/Stack-Node_%7C_React_%7C_Expo-black)](#-tech-stack)
[![Team](https://img.shields.io/badge/Team-Alpha_Tech-black)](#-team-alpha-tech)

NAJDDA is a multi-agent healthcare platform. A central **Orchestrator Agent (LangGraph)** coordinates specialized AI agents — Triage, Diagnosis, Pharmacy, Pregnancy, Pediatric, Allergy, Locator, Report, Follow-up — to give one safe, empathetic answer in **Arabic / Darija / French / Tamazight / English**.

Backend + Web Frontend + Mobile (Expo) + n8n Emergency automation, all powered by **Google Gemini API**.

## 👥 Team Alpha Tech

Built and maintained by **Alpha Tech**.

- Product & AI Orchestration — LangGraph + Gemini
- Mobile Emergency — Expo SOS, geolocation, n8n WhatsApp
- Web & UX — React, Darija-first design
- Medical Safety — pharmacy validation, guardrails, reports


## 🎯 Problem

Limited access to doctors, long waits, no follow-up, chronic disease burden, drug interaction risks, language barriers, delayed emergencies — especially in Morocco.

Classic health chatbots = single prompt, no memory, no emergency awareness, no collaboration.

NAJDDA = digital hospital: ONE assistant for patient, MULTIPLE experts behind, CONTINUOUS care.
Full vision: `docs/context.md`

## ✨ Features — Full List

**🤖 Orchestrator (LangGraph)**
- `POST /api/orchestrator/chat` → router → parallel agents → synthesis
- Single-agent passthrough for latency, multi-agent synthesis for complex cases
- History: `GET /api/orchestrator/history`, reset: `POST /api/orchestrator/reset`

**🚨 Emergency Mode**
- Safety gateway middleware, zero-temp classification, 2s fail-safe defaults to danger
- Mobile SOS overlay, auto-dial 150/112, location share
- n8n `emergency-workflow.json` → Google Places nearest hospital + Evolution API WhatsApp to emergency contact with reason + Maps link + profile (allergies, blood type)

**🩺 Medical Agents**
- Triage: symptoms, urgency, adaptive questions
- Diagnosis: differential, exams, risks (possibilities, never definitive)
- Pharmacy: OpenFDA + RxNav interactions, dosage, alternatives
- Pregnancy: trimester-aware safety
- Child/Pediatric: rash, dosage, growth
- Allergy: drug/food cross-checks
- Locator: hospitals, clinics, pharmacies
- Report: structured PDF-ready summary for doctors
- Follow-up: `تابعني بعد 10 ثواني` → push notification, medication reminders, fall-detection

**📸 Vision with Gemini**
- Upload prescription / skin photo → Gemini multimodal analysis → pharmacy/triage context

**👤 Patient System**
- Auth JWT + bcrypt (`/api/auth`), persistent profile (`/api/profile`): history, chronic diseases, meds, allergies, emergency contacts, language
- Chat persistence (`/api/chat`, `/api/conversations`), children (`/api/children`), drugs (`/api/medications`)

**🌍 Multilingual**
AR, Darija, FR, Tamazight, EN — cultural understanding, not just translation.

**⚡ Performance**
Compact profile injection, regex JSON extraction, think-tag stripping, 1024 token cap, SSE streaming, token budget.

## 🧠 AI — Gemini API Setup

| Layer | Model | Use |
| :--- | :--- | :--- |
| FAST | `LLM_MODEL_FAST (voir .env.preset.groq, ex qwen/qwen3.8-27b)` | routing, safety gateway, triage, <500ms |
| DEEP | `gemini-3.1-pro-preview` (or `LLM_MODEL_FAST (voir .env.preset.groq, ex qwen/qwen3.8-27b)`) | diagnosis, synthesis empathique |
| VISION | `LLM_MODEL_FAST (voir .env.preset.groq, ex qwen/qwen3.8-27b)` (multimodal) | prescriptions, rashes |

1. Get key: https://aistudio.google.com → Create API Key
2. Backend `.env`:
```env
GEMINI_API_KEY=AIzaSy...
MODEL_FAST=LLM_MODEL_FAST (voir .env.preset.groq, ex qwen/qwen3.8-27b)
MODEL_DEEP=LLM_MODEL_DEEP (voir .env.preset.groq, ex openai/gpt-oss-120b)
```
3. Code: use `@langchain/google-genai` in `GemmaClient.js` → rename to `GeminiClient.js`:
```js
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const fast = new ChatGoogleGenerativeAI({ model: process.env.MODEL_FAST, temperature: 0 });
const deep = new ChatGoogleGenerativeAI({ model: process.env.MODEL_DEEP, temperature: 0.3 });
```

> Note: vs local LLM, Gemini = needs internet, pay-per-token, data leaves device. For full offline, see old `LOCAL_GEMMA_README.md`.

## 🏗️ Architecture

```mermaid
graph TD
    User((Patient)) -->|Darija/AR/FR| App[Web + Mobile]
    App -->|POST /api/orchestrator/chat| O{Orchestrator LangGraph}
    O <-->|fast| F[LLM_MODEL_FAST (voir .env.preset.groq, ex qwen/qwen3.8-27b)]
    O <-->|deep| P[LLM_MODEL_DEEP (voir .env.preset.groq, ex openai/gpt-oss-120b)]
    O --> DB[(PostgreSQL)]
    O --> Em[Emergency] & Tri[Triage] & Pha[Pharmacy] & Mat[Maternal/Pediatric] & Loc[Locator]
    Em -->|SOS| SOS[150/112 + n8n WhatsApp]
    Pha <--> FDA[FDA / RxNav]
    Loc <--> Maps[Google Places]
    Em & Tri & Pha & Mat --> Syn[Synthesis Pro]
    Syn --> App
```

Docs: `docs/multi_agent_architecture.md`, `n8n/structure.md`

## 🧰 Tech Stack

**Backend:** Node 18+, Express 5, LangGraph, LangChain Google-GenAI, JWT, bcrypt, Helmet, CORS, Morgan, pg, axios
**APIs:** Gemini, OpenFDA, RxNav, OpenFoodFacts, Open-Meteo/Weather
**Web:** React 19, Vite, Tailwind 4, React Router 7, axios — pages: Login, Register, CompleteProfile, Dashboard, Settings
**Mobile:** Expo 54, RN 0.81, expo-router/location/notifications/sensors/image-picker/secure-store — screens: dashboard, triage, triage-hub, orchestrator, pregnancy, children, allergy, medications, emergency, fall-detection, follow-up-modal, settings
**Auto:** n8n + Evolution API + Google Places
**DB:** PostgreSQL — users, profiles, chats, notifications — `npm run db:init` + `db:migrate`

## 📁 Structure

```
backend/src/api/routes/ (auth, profile, chat, orchestrator, pregnancy, allergy, children, drug, conversation)
backend/src/core/orchestrator/ (graph.js, routerNode, agentNodes, synthesisNode)
backend/src/core/services/agents/ (Triage, Pharmacy, Diagnosis, Followup, Locator, Report)
backend/src/core/services/ (Allergy, Pregnancy, ChildSafety, DrugSafety, Vision, Chat)
backend/src/infra/ (postgres, repositories, OpenFda/RxNav clients)
frontend/src/pages/ frontend/src/features/auth/ mobile/app/(main)/ mobile/app/(auth)/
n8n/emergency-workflow.json docs/
```

## 🚀 Getting Started

Prereqs: Node 18+, PostgreSQL, Gemini API Key, Expo Go

```bash
# 1. Backend :5000
cd backend && npm install
cp .env.example .env
# DATABASE_URL=postgres://user:pass@localhost:5432/shifaa
# JWT_SECRET=xxx GEMINI_API_KEY=xxx
npm run db:init && npm run db:migrate && npm run dev

# 2. Web :5173
cd frontend && npm install && npm run dev

# 3. Mobile
cd mobile && npm install && npm start
# iOS: i | Android: a | Physical: scan QR

# 4. n8n
# import n8n/emergency-workflow.json
# set GOOGLE_MAPS_API_KEY, EVOLUTION_API_BASE_URL, EVOLUTION_INSTANCE, EVOLUTION_API_KEY
```

## 🧪 Test

- Urgence: `j'ai douleur thoracique qui irradie bras gauche` / `صدري كيضرني بزاف` → `isEmergency:true` → SOS
- Pharmacie: `6 mois enceinte, ibuprofène?` → Pharmacy+Maternal
- Suivi: `تابعني بعد 10 ثواني` → push
- Vision: upload ordonnance en mobile → analyse Gemini

API:
```
POST /api/auth/register | /api/auth/login
GET/PUT /api/profile
POST /api/orchestrator/chat {message, medication?, childProfile?}
POST /api/pregnancy/check | POST /api/allergy/check | POST /api/medications/check
GET /api/conversations
```

## ⚠️ Medical Disclaimer

NAJDDA assists, never replaces doctors. No definitive diagnosis. Emergency overrides all. In case of doubt, call 150/112 immediately.

## 🗺️ Roadmap

Wearables, EHR interop, hospital dashboard, lab OCR, telemedicine, rural offline kit, analytics.

---
Built with ❤️ by **Alpha Tech** — NAJDDA.
