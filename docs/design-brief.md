# Design Brief

> **DRAFT v2 — 2026-09-27 — rédigé depuis le code réel et `docs/context.md`.**
> Toute ligne marquée `[À VALIDER]` demande une décision produit de l'équipe.
> Les autres lignes sont des transcriptions de preuves existantes (code, maquettes, docs).
>
> **DÉCISIONS VALIDÉES (2026-09-27) :**
> 1. **UI BILINGUE** FR + EN (voir « Langue » plus bas).
> 2. **DARK MODE + LIGHT MODE** obligatoires, les deux conformes WCAG AA (voir `design-tokens.md`).

---

## Product definition

**What it is:**
NAJDDA — « The AI Hospital That Fits in Your Pocket » : une plateforme d'assistance
médicale multi-agents pour les patients au Maroc, qui coordonne triage, pharmacie, suivi et
détection d'urgence derrière une seule interface conversationnelle.

**What it is NOT:**
- Pas un remplaçant de médecin (« AI assists healthcare professionals; it does not replace them » — `docs/context.md`).
- Pas un chatbot généraliste (« NAJDDA is not a chatbot » — `docs/context.md`).
- Pas un dossier médical électronique ni une plateforme de télémédecine (vision long terme, hors périmètre UI actuel).
- Pas un outil de diagnostic définitif : le Diagnosis Agent « fournit des possibilités, pas des diagnostics ».

**Core value proposition:**
Un seul interlocuteur qui sait déjà mon profil médical et qui décide quels agents mobiliser —
sécurité d'urgence incluse — là où les chatbots médicaux existants répondent sans mémoire ni contexte.

**Primary job the product does:**
> When I feel unwell and I don't know if it's serious, help me triage my symptoms safely and fast
> so I can decide whether to wait, consult a doctor, or call emergency now.
> `[À VALIDER: c'est la reformulation depuis le code — confirmer que le triage, pas le suivi, est le job #1]`

---

## Users

> Source : `docs/context.md` + comportements réels du code. `[… interview]` = à confirmer en entretien.

### Primary user

| Attribute | Value |
|---|---|
| Role / title | Patient au Maroc (« regions where healthcare access is limited ») |
| Context when using this product | Sur mobile, souvent en urgence relative, dans sa langue naturelle (AR / Darija / FR / EN) — le header Chat annonce « AR · Darija · FR · EN » |
| Top 3 jobs-to-be-done | 1. Trier mes symptômes et savoir si c'est urgent |
| | 2. Vérifier la sécurité d'une médication / interaction (Pharmacy agent) |
| | 3. Être suivi après une consultation (Follow-up agent) |
| Biggest friction point today | « Limited access to healthcare professionals / long waiting times / delayed emergency response » (`docs/context.md`) |
| Definition of "fast enough" | Réponse de chat en quelques secondes (Groq free tier rate-limité — un 429 ralentit déjà le router) `[À VALIDER: seuil exact]` |

### Secondary user(s)

| User | Context | Jobs-to-be-done |
|---|---|---|
| Médecin / professionnel de santé | Reçoit le report généré par le Report Agent | Comprendre rapidement la situation du patient (« help healthcare professionals quickly understand ») |
| Aidant familial / contact d'urgence | Contacté par l'Emergency Mode | Être notifié en cas d'urgence, joindre le patient |

---

## Brand attributes

> DRAFT — dérivé des patterns récurrents du code (Dashboard, Chat). C'est la validation humaine qui
> les officialise. Test : une décision UI qui contredit l'attribute est fausse.

| Attribute | What it means for UI |
|---|---|
| `[À VALIDER]` **Clinical calm** | Fond clair (`#F8FAFC` / slate-50), cartes blanches, pas d'animation décorative, une seule couleur d'accent. Jamais de dashboard « festif ». |
| `[À VALIDER]` **Urgency cuts through** | Le rouge est **réservé** à l'urgence (Emergency SOS, banner CRITICAL, numéro d'appel). Aucun autre usage décoratif du rouge. Le bandeau d'urgence est toujours visible, jamais caché en hover/collapsé. |
| `[À VALIDER]` **Warmly human** | Salutation nommée (« Salam, {prénom} »), ton d'infirmier (« Speak with our lead nurse »), jamais robotique ni culpabilisant. |
| `[À VALIDER]` **Instrumented precision** | Micro-labels capitales 10px `tracking-widest`, valeurs vitales en `font-mono` (groupe sanguin, BMI), numérotation des services « 01 / 02 » — comme un panneau d'instrument clinique. |
| `[À VALIDER]` **Direct, zero ceremony** | Une action = un bouton. L'appel d'urgence est un lien `tel:` en un clic. Pas de wizard là où un écran suffit (sauf le profil médical, volontairement guidé). |

---

## Voice

**Do:**
- Adresse directe au patient, phrase courte (existant : « Do not wait for a chat reply. Call now. »)
- Match de langue imposé au LLM : reply dans « the exact language they used » (`synthesisNode.js`)
- Rester calme même en urgence ; informer, pas affoler
- Humilité médicale : possibilités, pas certitudes (« possibilities rather than definitive diagnoses »)

**Don't:**
- Jargon médical non expliqué ; blâme du patient (« you should have… »)
- Fausse certitude diagnostique
- Ton marketing dans les écrans de soin (le hero « Your AI-specialized hospital is ready » est à valider — `[À VALIDER]`)

**Error message pattern:**
Cause + remède immédiat, et si c'est médical → rappeler le numéro d'urgence.
Existant réel (ChatPage) : « I could not reach the medical service. If this is urgent, call the emergency number now. »
`[À VALIDER: la copy est EN alors que les réponses LLM sont FR/AR — alignement langues]`

**Empty state copy pattern:**
Invitation à l'action, pas de vide décoratif.
Existant réel : « Describe what you are feeling, in any language. » / « No recorded conditions. » / « None currently active. »

---

## Constraints

**Tech stack:**
- Web : React 19.2.7, react-router-dom 7.18.1, **Tailwind CSS 4.3.3** (entry : `@import "tailwindcss"` uniquement — **aucun token custom n'existe**), Vite 8.1.1, `lucide-react`
- Mobile : Expo 54 / RN 0.81 / expo-router 6 / `lucide-react-native` — doit rester en parité visuelle avec le web
- `[À VALIDER: aucune lib de composants (shadcn, etc.) — rester en Tailwind raw ?]`

**Platforms and breakpoints:**
- Web responsive : breakpoints réellement utilisés `md:` et `lg:` (Dashboard grid `col-span-12 lg:col-span-8`, Settings `md:grid-cols-2`)
- App iOS/Android (Expo) — `mobile/` , maquettes `design.html` / `design_pregnancy.html`
- Hors périmètre : desktop dédié, tv

**Accessibility baseline:**
`<< undefined — needs decision >>` — **VALIDÉ 2026-09-27 : WCAG 2.2 AA.** C'est du médical, focus visible et labels sont non-négociables.
État actuel mesuré : focus ring par défaut sauf Login/Register, `aria-label` sur 2 boutons icônes
du Chat, **ratios de contraste en échec sur les micro-labels** (`slate-400` = 2.56:1, `gray-400`
= 2.43:1 — voir `design-tokens.md`). La passe dark mode sert aussi à corriger ça.

**Known out-of-scope items:**
- n8n (copié, non branché — `TEST-RESULTS.md`), OpenClaw, streaming SSE (non implémenté)
- Dashboards cliniciens, EHR, imagerie (vision long terme)

**Performance budget:**
`<< undefined — needs decision >>` — contrainte réelle : free tier Groq/Gemini rate-limité
(retry up to 62 s), donc **aucune animation ou requête UI superflue** pendant l'attente de réponse chat.
`[À VALIDER: seuils TTI/bundle]`

---

## Langue — BILINGUE FR/EN (validé 2026-09-27)

L'UI est **bilingue français / anglais** sur les deux plateformes (web + app mobile).

**Preuve du besoin :** le produit vise le patient marocain et l'app mobile déclare
« AR · Darija · FR · EN » (ChatPage) et `docs/context.md` liste 5 langues, mais
**l'intégralité de l'UI web est en anglais** — gap constaté lors du relevé.

**Périmètre de la bascule (UI chrome uniquement, pas le contenu médical) :**
- Navigation, titres de pages, libellés de formulaires, boutons, états vides, messages d'erreur.
- **La langue des réponses LLM n'est pas concernée** : `synthesisNode.js` impose déjà
  « Write … in the exact language they used » → le patient reçoit du FR/AR/Darija si il écrit en darija.
  On ne traduit donc jamais un contenu généré par l'agent.

**Modèle retenu (à valider sur le détail) :**
- Langue pilotée par le profil patient : `user.profile.preferredLanguage` (champ déjà existant
  dans le modèle, valeurs actuelles `Arabic` / …) → un sélecteur de langue dans Settings.
- Règle d'affichage par défaut : **FR si `preferredLanguage` ∈ {Arabic, French, Darija}, sinon EN**
  (l'arabe et la darija n'ont pas d'UI traduite → repli sur le français, langue administrative
  et médicale la plus lue au Maroc).
- Chiffres/date : format FR (`jj/mm/aaaa`, virgule décimale) quand l'UI est en FR.
  Les valeurs cliniques (BMI, groupe sanguin) restent en `font-mono` quel que soit le format.
- **Aucune chaîne traduite ne doit dégrader l'urgence** : « Call 150 » / « Appeler 150 » — le
  numéro est identique, la structure du bouton est strictement la même dans les deux langues.

`[À VALIDER: la valeur exacte de preferredLanguage dans la DB est 'Arabic' par défaut —
confirmer si on ajoute 'Français' / 'English' comme valeurs d'énumération.]`

---

## Thème — DARK MODE + LIGHT MODE (validé 2026-09-27)

Les deux thèmes sont **obligatoires** et livrés dès la première passe UI.

**Justification produit :** utilisation nocturne d'un outil de triage (patient qui se sent mal
le soir), et `prefers-color-scheme` est une attente standard sur mobile comme sur le web.

**Règles :**
1. **Aucun composant ne code une couleur en dur.** Toutes les couleurs passent par des
   tokens sémantiques (voir `design-tokens.md`) — c'est la raison pour laquelle le
   `@theme` Tailwind 4 est la tâche UI #1.
2. Le basculement se fait via `class` sur `<html>` (Tailwind 4) + `localStorage`
   (`najdda-theme` ∈ `light` | `dark` | `system`) + respect de `prefers-color-scheme`
   quand la valeur est `system`. Toggle accessible dans la nav (Settings + Dashboard).
3. **Les deux thèmes passent WCAG 2.2 AA sur le texte et les composants d'interface** (≥ 4.5:1
   texte, ≥ 3:1 bordures/icônes). Ratios réellement mesurés dans `design-tokens.md`.
4. Le thème ne change **jamais** la présence ni la position d'une information d'urgence —
   il change uniquement sa couleur (le bandeau CRITICAL reste plein, en place, aussi visible
   en dark qu'en light).

`[À VALIDER: dark-first (défaut sombre, style « instrument clinique ») ou light-first
(défaut clair, conforme à l'existant) ? Proposition : light par défaut + respect de
prefers-color-scheme, pour ne pas casser l'existant au premier déploiement.]`

---

## Non-negotiables (médical — ne jamais violer lors d'un redesign)

1. Le bandeau d'urgence et le numéro d'urgence (150 Maroc, map par pays) restent **toujours visibles et cliquables**.
2. Un état CRITICAL n'est jamais masqué, tronqué, ou relégué derrière un « voir plus ».
3. Aucune décision de design ne supprime une information de sécurité « pour plus de clarté visuelle ».
4. Les chaînes d'urgence ne sont pas traduites à moitié : cohérence de langue garantie.
