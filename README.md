# NAJDDA — Multi-Agent Medical Orchestrator Platform

> *The AI Hospital That Fits in Your Pocket.*

See **[NAjdda-README.md](./NAjdda-README.md)** for full documentation.

## Live Deployment

**Web App:** [https://VOTRE-DOMAINE (ne pas exposer de HTTP clair avec données santé ; ancien IP http://51.170.138.137 à décommissionner)](https://VOTRE-DOMAINE (ne pas exposer de HTTP clair avec données santé ; ancien IP http://51.170.138.137 à décommissionner))

## Quick Start

```bash
# Backend
cd backend && npm install && npm run db:init && npm run db:migrate && npm run dev

# Frontend
cd frontend && npm install && npm run dev

# Mobile
cd mobile && npm install && npm start
```

## Tech Stack

- **Backend:** Node, Express 5, LangGraph, LangChain, PostgreSQL
- **Frontend:** React 19, Vite, Tailwind 4, React Router 7
- **Mobile:** Expo 54, React Native 0.81
- **Automation:** n8n + Evolution API + Google Places
- **LLM:** Provider-agnostic (Groq, Gemini, Ollama, vLLM via OpenAI-compat API)

Built with ❤️ by **Alpha Tech** — NAJDDA.
