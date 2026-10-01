# Démarrage local — NAJDDA

L'erreur « Je n'ai pas pu joindre le service médical » signifie que le **backend
n'est pas lancé**. Le frontend seul ne peut rien faire : le chat, le profil et
les agents vivent tous côté serveur.

## Ce qu'il faut

| Élément | Pourquoi | Comment |
| --- | --- | --- |
| **PostgreSQL** | users, profils, historique de chat | Docker, ou un Postgres local |
| **`backend/.env`** | clé LLM + connexion DB | `cp .env.preset.groq .env` puis compléter |
| **Une clé LLM** | le triage, le diagnostic, la synthèse | Groq (gratuit, rapide) ou Gemini |

## Étapes

```bash
# 1. Base de données
docker run -d --name shifaa-db -p 5433:5432 \
  -e POSTGRES_USER=shifaa -e POSTGRES_PASSWORD=shifaa_dev -e POSTGRES_DB=shifaa \
  postgres:17-alpine

# 2. Configuration backend
cd backend
cp .env.preset.groq .env
cp .env.example .env            # garde PORT / DATABASE_URL / JWT_SECRET
# puis colle ta clé Groq dans LLM_API_KEY et un JWT_SECRET au moins 32 caractères
# openssl rand -hex 32

# 3. Schéma
npm run db:init

# 4. Backend
npm run dev                      # http://localhost:5000
```

Puis le frontend, dans un autre terminal :

```bash
cd frontend
npm install
npm run dev                      # http://localhost:5173
```

## Vérifier que ça marche

```bash
curl http://localhost:5000/api/health     # doit répondre {"ok":true}
cd backend && npm test                    # détection de langue incluse
```

## Si le backend démarre mais que le chat échoue encore

| Symptôme | Cause |
| --- | --- |
| `LLM API error 401` | `LLM_API_KEY` vide ou périmée |
| `ECONNREFUSED ... 5433` | Postgres éteint |
| `FATAL: JWT_SECRET` | secret absent ou < 32 caractères |
| Page blanche au démarrage | `localStorage` bloqué → l'app dégrade en mémoire, pas de crash |

## Langues

Le patient écrit dans la langue qu'il veut — darija en lettres latines
(`mrid ana`), darija en lettres arabes, arabe standard, tamazight (tifinagh) ou
français. `backend/src/core/lib/language.js` détermine la langue de réponse avant
d'appeler le modèle, et `backend/tests/language.js` verrouille ce comportement.

## Urgences — le filet de sécurité ne dépend pas du modèle

Avant d'appeler quoi que ce soit, `core/lib/redFlags.js` compare le message à une
liste de signaux vitaux dans les 5 langues (fr, en, ar, darija, tamazight). Un
match court-circuite vers la réponse d'urgence et le numéro national, sans appel
modèle : un quota épuisé, un timeout ou une panne de fournisseur ne peuvent pas
faire passer une douleur thoracique pour un mal de tête.

```bash
node tests/redflags.js    # 57 cas : signaux positifs, faux positifs, négations
```

## n8n — alerte WhatsApp au contact d'urgence (optionnel)

n8n envoie un SMS/WhatsApp au contact d'urgence avec la position GPS et le
profil médical quand une urgence vitale est détectée. **Si n8n est éteint ou
cassé, le patient reçoit quand même son numéro d'urgence immédiatement** —
l'appel au 150 n'attend jamais le webhook.

### Mise en place

1. Importer le workflow : n8n → Workflows → Import from File →
   `n8n/emergency-workflow.json`, puis l'activer.
2. Déclarer les variables dans n8n (Settings → Variables, sans préfixe `$env` à
   saisir, l'expression les lit) :
   `N8N_WEBHOOK_SECRET`, `GOOGLE_MAPS_API_KEY`, `EVOLUTION_API_KEY`,
   `EVOLUTION_INSTANCE`, `EVOLUTION_API_BASE_URL`.
3. Générer un secret long et le mettre **des deux côtés** :

```bash
openssl rand -hex 32     # → N8N_WEBHOOK_SECRET dans n8n ET dans backend/.env
```

4. Reporter l'URL de production du webhook dans le backend :

```bash
N8N_EMERGENCY_WEBHOOK_URL=https://n8n.exemple.com/webhook/emergency-alert
N8N_WEBHOOK_SECRET=<le même secret qu'dans n8n>
```

Laisser `N8N_EMERGENCY_WEBHOOK_URL` vide désactive toute l'alerte externe.

### Vérifier sans n8n

Le workflow n'est pas exécuté par les tests — il n'y a pas de runtime n8n ici.
Ce qui nous appartient, lui, est vérifié pour de vrai : un récepteur local reçoit
le payload réel, contrôle le secret, et prouve qu'une panne du webhook ne
retarde pas la réponse d'urgence.

```bash
node tests/n8n_workflow.js   # structure du graphe, branches mortes, non-fatal, contrat
node tests/n8n_e2e.js        # payload livré, secret rejeté, webhook mort, relances 5xx/4xx
```
