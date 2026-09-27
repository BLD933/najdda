# UX Vocabulary

> **DRAFT v2 — 2026-09-27 — transcrit du code réel** (libellés = string exacte en JSX,
> sauf mention « proposé »). Checklist avant tout travail visuel : chaque action, état et
> surface du design proposé doit apparaître ici d'abord.
>
> **DÉCISIONS VALIDÉES 2026-09-27 : UI BILINGUE FR/EN + DARK/LIGHT MODE (WCAG 2.2 AA).**
> → une ligne ci-dessous vaut dans les deux langues, avec la traduction FR à côté.
> Les libellés listés ici sont la colonne EN (état actuel du code) ; la colonne FR est à
> produire dans la même passe de refonte (voir design-brief § Langue).

---

## Primary actions

| Action | Where it appears | Input | Outcome | Notes |
|---|---|---|---|---|
| `Sign In` | LoginForm | submit | `POST /auth/login` → redirige `/dashboard` | label devient `Signing in...` + spinner pendant l'envoi |
| `Sign up` | RegisterForm → `/register` | submit | `POST /auth/register` → profil obligatoire ensuite | même motif loading |
| `Save Medical Passport Updates` | Settings (sticky footer) | submit | `PUT profile` → bannière verte « Medical Passport updated successfully! » auto-dismiss 3 s | désactivé + `Saving Changes...` pendant l'envoi |
| Send (icône) | Chat composer | click / Enter | `POST /orchestrator/chat` → bulle assistant | `aria-label="Send"` ; disabled si input vide ou envoi en cours ; devient spinner |
| `Open Service` | Dashboard card « Symptom Triage » | click sur la carte | navigate `/chat` | label visible **seulement au hover** ⚠ (state=machine `01`) |
| `Active Mode` | Dashboard card « Emergency SOS » | click sur la carte | `window.open('tel:{numero}')` | **lien tel: direct, aucune conversation** |
| `Call {numero}` | Chat banner urgence | click | `href=tel:` | numero déduit du pays (`EMERGENCY_BY_COUNTRY`, Maroc = **150**) |

---

## Secondary actions

| Action | Where it appears | Input | Outcome | Notes |
|---|---|---|---|---|
| `Clear conversation` (RotateCcw) | Chat header | click | `POST /orchestrator/reset` + vide les messages + clear urgence | **aucune confirmation** — cf. interaction-system |
| `Exit` | Dashboard nav | click | `logout()` → `/login` | label ambigu → proposé `Log out` |
| `Passport` (icône Settings) | Dashboard nav + Identity Snapshot | click | navigate `/settings` | le mot « Passport » = nom du profil médical dans l'UI |
| `+ Add Contact` | Settings section Emergency | click | ajoute un formulaire contact | — |
| `Remove` | Settings médicaments | click | retire le médicament du formulaire | **aucune confirmation** |
| Back (ArrowLeft) | Chat + Settings headers | click | navigate `/dashboard` | `aria-label` manquant dans Settings |
| `Sign up` / `Sign in` (liens) | LoginForm / RegisterForm | click | bascule `/register` ↔ `/login` | — |
| Pills multi-select | Settings « Medical Conditions » | click | toggle dans `chronicDiseases` | style sélectionné : `bg-blue-50 border-blue-500 text-blue-700 font-bold` |

---

## States

| State | Where it applies | Meaning | UI treatment |
|---|---|---|---|
| **Emergency / CRITICAL** | réponse chat (`isEmergency`) | détection vitale par le triage | banner rouge `bg-red-600` « Emergency detected » + lien `Call {numero}` ; badge rouge dans la bulle (`ShieldAlert`, « Emergency detected ») — **jamais masquer** |
| Sending / in-flight | chat | requête en cours | bulle assistant spinner « Consulting agents… » + bouton send désactivé |
| Error (chat unreachable) | chat | échec API | bulle assistant `border-red-300 text-red-700` avec remède + numéro d'urgence |
| Error (form server) | Login/Register | échec auth | bannière `bg-red-50 border-red-200` au-dessus du form |
| Success (saved) | Settings | save OK | bannière verte CheckCircle2, auto-clear 3 s |
| Loading (page) | App ProtectedRoute, Settings, Chat | session/historique en cours | spinner centré bleu |
| Profile incomplete | ProtectedRoute | profil médical incomplet | redirect forcé `/complete-profile` (7 champs requis : DOB, groupe sanguin, ville, tél, genre, poids, taille) |
| Follow-up pending | API `followupMessage` / `followupTimeMinutes` | check-in programmé | ⚠ **stocké dans ChatPage mais jamais rendu** — gap à implémenter |
| System live | Dashboard nav | statut | point vert `animate-pulse` + « System Live » |
| Empty (chat) | Chat, 0 message | pas d'historique | « Describe what you are feeling, in any language. » |
| Empty (profile lists) | Dashboard/Settings | rien d'enregistré | « No recorded conditions. » / « None currently active. » / « None set » |
| Disabled input | Settings « Full Name » | non éditable | `disabled` + `cursor-not-allowed` + fond gris |
| Severity tags | réponses agents (backend) | `[SEVERITY:…]` | **strippées avant affichage** (synthesisNode) — l'UI n'a pas d'échelle de gravité visible hors CRITICAL |

---

## Surfaces

| Surface | Route or trigger | Primary action(s) available | Notes |
|---|---|---|---|
| Login | `/login` | Sign In, lien Sign up | carte centrée `max-w-md`, style générique (B) |
| Register | `/register` | Sign up, lien Sign in | même carte |
| Complete Profile | `/complete-profile` (redirect si profil incomplet) | wizard de saisie médicale | 696 lignes, étape unique longue `rounded-xl` — candidat au split en étapes |
| Dashboard | `/dashboard` | Open Service (chat), Emergency SOS (tel:), Passwort, Exit | hero « Salam, {prénom} », 2 cartes numérotées, sidebar Identity Snapshot + Primary Hospital — style signature (A) |
| Chat | `/chat` | Send, Clear conversation | header + historique + composer fixe ; banner urgence en fin de fil ⚠ **apparaît sous le fil, peut demander scroll** |
| Settings (Passport) | `/settings` | Save, Add/Remove items | sticky footer save `z-50` ; 4 sections (Identity, Conditions, Pharmacy, Emergency) |
| Emergency Mode (web) | carte SOS / banner chat | `tel:` direct | **pas d'écran dédié web** (l'app mobile a `emergency.js`) |
| App mobile (Expo) | `mobile/app/**` | 18 écrans (`(auth)`, `(onboarding)`, `(main)`) | maquettes `mobile/design.html` (M3/Inter) **non parité avec le web** |

---

## Copy patterns

| Pattern | Template | Example (from real UI — do not invent) |
|---|---|---|
| Confirmation prompt | `<< pattern indéfini — aucune confirmation dans l'app >>` | — |
| Error message (chat) | « I could not reach the medical service. If this is urgent, call the emergency number now. » | ChatPage L72 |
| Error message (form) | `err.response?.data?.message \|\| 'Update failed'` | Settings L162 |
| Empty state (chat) | « Describe what you are feeling, in any language. » | ChatPage L106 |
| Empty state (data) | « No recorded conditions. » / « None currently active. » | Dashboard |
| Success feedback | « Medical Passport updated successfully! » | Settings L187 |
| Greeting | « Salam, {prénom}. » | Dashboard hero |
| Loading (async) | « Signing in... » / « Saving Changes... » / « Consulting agents… » | partout |
| Micro-label | `{UPPERCASE} {tracking-widest}` 10px black | « System Live », « Identity Snapshot », « Chronic Registry » |
| Emergency copy | « Emergency detected » + « Do not wait for a chat reply. Call now. » | ChatPage |
| **Langue (VALIDÉ 2026-09-27)** | l'UI bascule FR/EN via `user.profile.preferredLanguage` ; défaut FR si ∈ {Arabic, French, Darija} | voir design-brief § Langue — les réponses LLM restent dans la langue du patient, jamais traduites |
| **Thème (VALIDÉ 2026-09-27)** | light / dark / system — bascule jamais univoque | `.dark` + `localStorage['shifaa-theme']` + `prefers-color-scheme` ; default `system` |
