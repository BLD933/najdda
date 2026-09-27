# Interaction System

> **DRAFT v1 — 2026-09-27 — remplit depuis le code réel.** Chaque règle dit ce que le code fait
> AUJOURD'HUI ; les incohérences sont signalées `[DRIFT]` et les règles proposées `[À VALIDER]`.

---

## Form validation

**When does validation trigger?**
HTML5 native uniquement (`required` sur les inputs Login/Register) → à la soumission.
Aucune validation onBlur, aucune validation client sur CompleteProfile/Settings.
`[À VALIDER: proposer "on submit d'abord, puis on-change après le 1er échec" — règle standard]`

**How is an error displayed?**
- Erreur client (native) : popup navigateur par défaut (aucun style projet).
- Erreur serveur : **bannière au-dessus du formulaire** — `bg-red-50 border-red-200 text-red-600 rounded-lg` (LoginForm), même motif dans AuthContext pour Register.
- `[DRIFT]` Settings utilise `setError('Failed to load profile load')` mais **n'affiche jamais `error` dans le JSX** → erreurs de chargement invisibles. Bug à corriger.

**Error message structure:**
Cause + remède. Existant réel : « I could not reach the medical service. If this is urgent, call the emergency number now. » (ChatPage).
`[À VALIDER: pattern proposé = "{Champ} : {cause}. {Remède}." et jamais de texte technique brut pour le patient]`

**What happens to the submit button while the form has errors?**
Le bouton reste actif ; pendant l'envoi il devient `disabled` + spinner + libellé muté
(« Signing in... », « Saving Changes... », « Consulting agents… »). **Ce motif est cohérent partout → c'est la règle.**

**How are server-side errors (post-submit) shown?**
Bannière au-dessus du formulaire, effacée à la prochaine soumission (`setError('')`).
`[DRIFT]` ChatPage affiche l'erreur **dans la bulle assistant** (rouge) — c'est le bon motif pour un chat, pas pour un form. Deux motifs, à documenter comme tels.

---

## Loading and async

**Page-level loading state:**
Spinner centré plein écran — App.jsx : `h-12 w-12 border-b-2 border-blue-600 animate-spin` ;
Settings/Chat : `Loader2 size={40}` bleu. **Aucun skeleton dans le projet.**
`[À VALIDER: introduire des skeletons pour l'historique chat + Dashboard ?]`

**Component-level loading state:**
**Règle existante (cohérente) : `disabled` + spinner `Loader2` + changement de libellé.**
Chat : le bouton send devient spinner dans le cercle ; une **bulle « Consulting agents… »** apparaît
en position assistant pendant l'attente.

**Optimistic updates:**
Aucune. Chaque écriture attend le serveur (Settings save, chat send).

**Polling / streaming:**
Aucun. **Le streaming SSE annoncé dans le README n'est pas implémenté** (MIGRATION-NOTES.md) —
l'état « updating » du chat = la bulle spinner, point. Le suivi se fait par rechargement d'historique
au mount (`GET /orchestrator/history`).
`[À VALIDER: rester en request/response pour la finale, ou implémenter le streaming ?]`

---

## Destructive actions

> `[DRIFT]` Aujourd'hui **aucune action destructive n'a de confirmation**. C'est le plus gros trou.

| Severity | Criteria | UI pattern (actuel → proposé `[À VALIDER]`) |
|---|---|---|
| Low — easily undoable | Effacer la conversation (`RotateCcw`, « Clear conversation ») | Actuel : effet immédiat, aucun warning. **Proposé : OK immédiat mais toast « Conversation cleared » + bouton Undo… ou au minimum aria-label + titre explicite.** |
| Medium — consequential, recoverable | Retirer un médicament (« Remove »), ajouter/supprimer un contact d'urgence | Actuel : immédiat, sans confirmation. **Proposé : dialogue « Retirer {med} du profil ? » — c'est une donnée de santé.** |
| High — irreversible | Déconnexion (« Exit ») | Actuel : immédiat. **Proposé : acceptable sans dialog (réversible par re-login), mais le label « Exit » est ambigu → « Log out ».** Suppression de compte : **n'existe pas** — hors périmètre actuel. |

**What text goes in the confirmation?**
`<< undefined — needs decision >>` — Proposition : « Retirer {élément} de votre passeport médical ? » /
Confirm : « Retirer » / Cancel : « Annuler ». `[À VALIDER — copy exacte et langue FR]`

---

## Empty states

**When a list or table has no data:**
Phrase courte en italique/gris + jamais un vide nu. Preuves réelles :
- Chat vide : « Describe what you are feeling, in any language. » (centré, `py-16`)
- Aucune pathologie : « No recorded conditions. »
- Aucun médicament : « None currently active. »
- Hôpital : « None set » / Localisation : « Not set — enable in Passport »

**When a search or filter returns no results:**
`[DRIFT]` Recherche médicament : dropdown simplement disparaît si 0 résultat → **pas de copy « aucun résultat »**.
**Proposé : « Aucun médicament trouvé pour « {query} ». »** `[À VALIDER]`

**When an error prevents data from loading:**
- Chat historique : échec **silencieux** (commentaire : « history is a nice-to-have ») — acceptable.
- Settings profil : `setError` mais **non affiché** (bug, voir plus haut).
- Chat message : bulle assistant rouge avec le remède + numéro d'urgence.
`[À VALIDER: règle — toute erreur bloquante affiche un bouton « Réessayer »]`

---

## Focus and keyboard

**Tab order rule:**
Ordre DOM naturel, aucun `tabindex` custom. **Pas de piège de focus car aucune modale sur le web**
(le follow-up modal n'existe que sur mobile).

**Focus trap rule:**
Non défini (pas de overlays focusables côté web).
`<< undefined — needs decision >>` — si une modale est ajoutée : focus trap obligatoire (cf. `accessible-components`).

**Visible focus indicator:**
`[DRIFT]` Par défaut navigateur partout SAUF :
- Login/Register : `focus:ring-2 focus:ring-offset-2 focus:ring-blue-500` (correct)
- Settings med search : `focus:border-blue-500` (correct)
- Chat input : `focus:border-blue-600` sans ring (partiel)
- Boutons icônes Chat (back/reset) : **aucun style focus** ⚠
**Règle proposée :** ring bleu projeté sur TOUS les focusables. `[À VALIDER]`

**Keyboard shortcut policy:**
Aucun raccourci global. Enter soumet les formulaires (natif) ; Enter dans l'input chat envoie le message (submit natif).

**Skip-to-content link:**
Aucune aujourd'hui. **Ajout requis** (WCAG 2.2 AA validé) : lien « Aller au contenu » en premier
focus sur Login/Register/Dashboard/Chat/Settings, cible `id="main"` (ou `#content`).
Sur mobile (React Native) : non applicable.

**A11y existant (preuves) :** `aria-label` sur les 2 boutons icônes du Chat (« Back to dashboard »,
« Clear conversation », « Send »), `aria-label` absent sur les boutons icônes Settings.
**Baseline : WCAG 2.2 AA (validé 2026-09-27).** Écarts connus à corriger dans la passe UI :
micro-labels sous 4.5:1, focus ring absent sur les boutons icônes, skip-link manquant,
`aria-label` manquant sur les icônes Settings, aucun `aria-live` sur la bulle « Consulting agents… »
→ `role="status"` pour que le statut d'attente soit annoncé.

---

## Theme (validé 2026-09-27)

- Bascule light ↔ dark : voir `design-tokens.md` § « Theme switching » (`.dark` + localStorage + `system`).
- Le toggle est un bouton `aria-pressed`, libellé traduisible.
- **Le thème ne modifie ni la présence ni l'ordre d'aucune information d'urgence** : seul un
  bandeau CRITICAL reste plein et à la même place dans les deux thèmes.
- En dark, le texte du bandeau d'urgence passe à `#0F172A` sur `red-500` (et non blanc, mesuré 3.76:1).
- Si un switch de langue et un switch de thème sont côte à côte dans Settings : le switch de
  langue déclenche un `document.documentElement.lang = 'fr' | 'en'` (lecteurs d'écran).
