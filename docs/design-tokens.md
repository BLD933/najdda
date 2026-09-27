# Design Tokens

> **État : implémenté et vérifié — 2026-09-27.**
> Source unique : `frontend/src/index.css` (Tailwind 4, bloc `@theme` + bloc `.dark`).
> Ce document **transcrit le code réel** et n'autorise plus de valeur qui n'y figure pas.
> Les ratios sont **mesurés** (formule WCAG 2.2, relue sur l'app en marche dans les deux
> thèmes), jamais estimés à l'œil. Script de mesure : `/tmp/measure_tokens.py`.

---

## Contrat de tokens

Les tokens existent. Un composant n'écrit **jamais** `blue-600` ni `#0F172A` : il écrit
`bg-primary`, `text-ink`, `border-line`. C'est la condition pour que le dark mode soit gratuit.

Vérification mécanique : `grep -rE "bg|text-(blue|red|green|slate|gray|amber)-[0-9]{2,3}" src/**/*.jsx`
→ **0 occurrence**.

---

## Couleurs

### Surfaces et encre

| Token | Light | Dark | Usage |
|---|---|---|---|
| `canvas` | `#f8fafc` | `#020617` | fond de page |
| `surface` | `#ffffff` | `#0f172a` | cartes, header, composer chat |
| `surface-2` | `#f8fafc` | `#1e293b` | champs de formulaire, « Identity Snapshot » |
| `surface-3` | `#f1f5f9` | `#334155` | lignes alternées, fonds enfoncés |
| `ink` | `#0f172a` | `#f1f5f9` | texte principal |
| `ink-muted` | `#64748b` | `#94a3b8` | descriptions, sous-titres |
| `ink-subtle` | `#475569` | `#94a3b8` | micro-labels 10px `tracking-widest` |

### Bordures — deux paliers, et pourquoi

| Token | Light | Dark | Rôle |
|---|---|---|---|
| `line` | `#e2e8f0` | `#334155` | **décoratif** — bord de carte |
| `line-strong` | `#64748b` | `#94a3b8` | **contour de champ** — input, select, textarea |

> ⚠️ **Ne pas réintroduire l'ancienne valeur.** `#CBD5E1` en light et `#475569` en dark ont été
> mesurés puis **abandonnés**. Si un contour d'input devient invisible à l'écran, ce n'est pas
> une raison de descendre la valeur : les valeurs actuelles sont déjà celles qui passent.
> La règle qui a produit ces valeurs : **en dark, la bordure doit être plus CLAIRE qu'en light,
> pas plus sombre** — sur un champ `#020617`, une bordure sombre disparaît.

**`line` échoue volontairement le seuil 3:1** (1.23:1 light / 1.72:1 dark). C'est une décision
assumée, pas un oubli : le SC 1.4.11 exige 3:1 pour ce qui est **nécessaire pour identifier un
composant**. Le bord d'un champ de saisie en est un ; le liseré décoratif d'une carte ne l'est
pas, puisque la carte est déjà délimitée par `surface` vs `canvas`. **Le seuil ne dépend pas de la
taille du texte** — du texte plus gros ne fait pas baisser 4.5:1.

`line-strong` vise 4.5:1 et non le minimum 3:1, parce qu'un contour de champ *est* l'identifiant
du champ : on le traite comme du texte.

### Primaire

| Token | Light | Dark |
|---|---|---|
| `primary` | `#2563eb` | `#60a5fa` |
| `primary-hover` | `#1d4ed8` | `#93c5fd` |
| `primary-subtle` | `#eff6ff` | `#1e3a5f` |
| `on-primary` | `#ffffff` | `#0f172a` |
| `on-primary-subtle` | `#1d4ed8` | `#bfdbfe` |
| `on-primary-muted` | `#eff6ff` | `#172554` |

`on-primary-muted` est de l'**encre atténuée sur le fond `primary`** (carte « Primary Hospital »),
pas une teinte de hero. Deux pièges déjà payés :

1. **`text-on-primary/70` est interdit ici** : 3.34:1 sur `primary`. D'où un token à part.
2. **Les `blue-100` à `blue-300` échouent tous** sur le `primary` light (2.87 → 4.24). Seul
   `blue-50` `#eff6ff` passe, à 4.75:1. En dark il faut l'inverse : `blue-950` `#172554` (5.78:1),
   car `blue-900` ne monte qu'à 4.07:1.

### Hero — panneau d'accent, pas un second thème

| Token | Light | Dark |
|---|---|---|
| `hero` | `#0f172a` | `#0f172a` (**épinglé**) |
| `on-hero` | `#f8fafc` | `#f8fafc` |
| `on-hero-muted` | `#94a3b8` | `#94a3b8` |
| `on-hero-accent` | `#3b82f6` | `#3b82f6` (**épinglé**) |

> **Le hero ne s'inverse PAS entre les thèmes.** Le token `ink-inverse` décrit dans une version
> précédente de ce document **n'existe pas** et ne doit pas être réintroduit. La surface est
> épinglée sombre dans les deux thèmes, et tout ce qu'elle contient utilise `on-hero*` :
> c'est ce qui supprime le besoin de `dark:` à l'intérieur du hero. Inverser le hero forçait à
> re-calibrer chaque couleur enfant deux fois, et l'un des deux thèmes échouait toujours.

> Le token `on-primary-muted` **ne bénéficie pas** de cette immunité : il vit sur `primary`, pas
> sur `hero`. C'est exactement l'erreur que le projet a corrigée en septembre 2026 (3.64:1 → 4.75:1).

> **Le prénom dans l'accueil ne doit PAS utiliser `primary`.** `primary` est épinglé en dark mais
> pas en light ; la surface `hero`, elle, l'est dans les deux. Résultat mesuré : `#2563eb` sur
> `#0f172a` = **3.45:1**, sous le seuil AA — en light seulement, ce qui est exactement le piège que
> l'épinglage du hero est censé éviter. Le jeton `on-hero-accent` (`blue-500`, 4.85:1) est le pas de
> rampe le plus proche qui passe. `DashboardPage.jsx` découpe la chaîne sur le slot `{name}` plutôt
> que de concaténer, pour que la ponctuation après le prénom reste dans le dictionnaire.

> `on-hero-accent` est déclaré **à l'identique dans les deux thèmes**, comme le reste du panneau :
> la surface étant la même, son accent doit l'être aussi. Le redéclarer dans `.dark` n'est pas une
> redondance, c'est ce qui garde `.dark` lisible comme une définition de thème complète.

### Statuts

| Token | Light | Dark |
|---|---|---|
| `emergency` | `#dc2626` | `#ef4444` |
| `emergency-hover` | `#b91c1c` | `#f87171` |
| `emergency-subtle` | `#fef2f2` | `#450a0a` |
| `on-emergency` | `#ffffff` | `#0f172a` |
| `on-emergency-subtle` | `#b91c1c` | `#f87171` |
| `success` | `#22c55e` | `#4ade80` |
| `success-subtle` | `#f0fdf4` | `#052e16` |
| `on-success-subtle` | `#15803d` | `#bbf7d0` |
| `warning` | `#f59e0b` | `#fbbf24` |
| `warning-subtle` | `#fffbeb` | `#451a03` |
| `on-warning-subtle` | `#b45309` | `#fde68a` |

`emergency` est **réservé** : bouton SOS, bandeau CRITICAL, badge d'urgence, icône téléphone des
contacts d'urgence. Ne jamais l'utiliser comme accent décoratif.

> **`on-emergency` n'est pas blanc en dark.** `#FFFFFF` sur `red-500` = 3.76:1, sous le seuil AA
> texte. D'où `#0f172a` en dark. Même logique pour `on-primary`.

---

## Internationalisation

**Aucune dépendance.** Ni `i18next`, ni `react-intl`, ni polyfill : `CLAUDE.md` interdit d'ajouter
une dépendance runtime sans accord, et le bundle doit rester maigre pour le WebView mobile. Le
provider tient en une quarantaine de lignes et deux dictionnaires plats.

| Fichier | Rôle |
|---|---|
| `src/features/i18n/I18nContext.jsx` | provider, `t()`, bascule `<html lang>` |
| `src/features/i18n/LanguageSwitcher.jsx` | bascule FR/EN (radio group) |
| `src/features/i18n/locales/fr.js` | 168 clés — **dictionnaire de référence** |
| `src/features/i18n/locales/en.js` | 168 clés, même ordre |
| `src/features/i18n/valueLabels.js` | libellés d'affichage des 50 valeurs d'enum du back |
| `src/features/i18n/checkParity.js` | `npm run i18n:check` |

**Clés plates et séparées par des points** (`wizard.step.identity`), jamais imbriquées. Les deux
dictionnaires se diffent alors ligne à ligne, et n'importe quelle clé est retrouvable depuis le
composant qui l'affiche. L'ordre des clés est identique dans les deux fichiers : c'est ce qui rend
la vérification de parité possible.

**`fr` est la référence, `en` est la traduction.** `t()` retombe sur `en` si une clé manque en fr,
puis renvoie la clé brute en dernier recours — en dev, le provider prévient sur la console plutôt
que de laisser une chaîne angliche passer en production sans bruit.

Trois règles que ce projet a apprises à ses dépens :

1. **Un `t()` appelé au niveau module fige la langue.** `CompleteProfilePage.jsx` définit `STEPS`
   au niveau module : le tableau contient donc des **clés**, jamais des chaînes traduites, sinon il
   serait lié à la langue active au premier import et ne se re-renderait pas au changement.
2. **Un `useEffect` qui annonce une étape doit dépendre de `t`**, sinon l'annonce reste dans
   l'ancienne langue après bascule.
3. **Le `t` d'un fetch unique se lit dans une ref.** Re-télécharger toute la liste des options
   pour reformuler une phrase d'erreur rouvrirait la porte de chargement à chaque bascule ;
   `tRef.current` garde l'effet à `[]`.

**`<html lang>` est posé deux fois, et ce n'est pas un doublon.** Une fois dans le provider (source
de vérité), une fois dans le script inline d'`index.html`, avant React. C'est du SC 3.1.1 : un
lecteur d'écran choisit sa voix à partir de cet attribut, et le changer plus tard oblige à
re-tâcher la phrase en cours. Même raison que pour le thème — le premier rendu doit être correct.
L'option elle-même porte `lang="fr"` / `lang="en"` (SC 3.1.2), pour que « Français » soit lu avec
une voix française par un lecteur d'écran réglé en anglais.

**Les dates suivent la langue** : `toLocaleDateString(lang)`. Sans locale explicite, la même date
s'affiche `09/27/2026` aux US et `27/09/2026` en France.

### Ce qui n'est **pas** traduit, et pourquoi

- **La réponse de l'agent** est affichée telle quelle. Le backend répond déjà dans la langue du
  patient (arabe / darija / fr / en) ; la retraduire ici écraserait sa réponse par la locale de
  l'interface, qui n'est pas forcément la sienne.
- **Les valeurs d'enum telles qu'elles sont stockées** (`GENDERS`, `BLOOD_TYPES`,
  `RELATIONSHIPS`, `CHRONIC_CONDITIONS`…) viennent de l'API et **retournent au back
  inchangées** : seule l'affichage passe par `tValue()` dans `valueLabels.js`. C'est la règle
  `value=` brut / `label=` traduit, vérifiée sur le DOM réel. Écrire « Homme » dans la colonne
  `gender` brouillerait toute correspondance back par la suite.

### « Garder le texte médical d'urgence inchangé » — lecture retenue

L'instruction est interprétée comme *ne pas réécrire la copie d'urgence pendant qu'on affine
l'interface*, et non *ne jamais la traduire* — sinon la surface la plus critique en matière de
sécurité resterait la seule en anglais, ce qui viderait l'exigence bilingue de son sens. Les
chaînes d'urgence sont donc traduites **fidèlement** : même gravité, même impératif, même ordre,
aucun adoucissement. Et le **numéro** d'urgence n'est jamais écrit dans une phrase : il vient
toujours de l'appelant, via `{number}`. Une chaîne d'urgence ne peut donc pas appeler le mauvais
numéro.

---

## Audit de contraste (mesuré, 2026-09-27)

| Paire | Light | | Dark | |
|---|---|---|---|---|
| texte courant sur `surface` | 17.85 | OK | 16.30 | OK |
| texte sur `canvas` | 17.06 | OK | 18.41 | OK |
| `ink-muted` sur `surface` | 4.76 | OK | 6.96 | OK |
| `ink-subtle` (micro-label) | 7.58 | OK | 6.96 | OK |
| **`line-strong` sur `surface-2`** | **4.55** | OK | **5.71** | OK |
| `line` sur `surface` (décoratif) | 1.23 | assumé | 1.72 | assumé |
| `emergency` en texte sur `surface-2` | 4.62 | OK | 3.89 | voir ci-dessous |
| `on-primary` sur `primary` | 5.17 | OK | 7.02 | OK |
| `on-primary` sur `primary-hover` | 6.70 | OK | 9.90 | OK |
| `primary` en texte sur `surface` | 5.17 | OK | 7.02 | OK |
| `on-primary-subtle` sur `primary-subtle` | 6.16 | OK | 8.10 | OK |
| **`on-primary-muted` sur `primary`** | **4.75** | OK | **5.78** | OK |
| `on-hero` sur `hero` | 17.06 | OK | 17.06 | OK |
| `on-hero-muted` sur `hero` | 6.96 | OK | 6.96 | OK |
| **`on-hero-accent` sur `hero`** | **4.85** | OK | **4.85** | OK |
| `on-emergency` sur `emergency` (SOS) | 4.83 | OK | 4.74 | OK |
| `emergency` en texte sur `surface` | 4.83 | OK | 4.74 | OK |
| `on-emergency-subtle` | 5.91 | OK | 5.84 | OK |
| `on-success-subtle` | 4.79 | OK | 12.30 | OK |
| `on-warning-subtle` | 12.03 | OK | 12.03 | OK |

**Un seul « échec » au seuil 3:1, et il est voulu** : `line`, cf. la section Bordures. Ce n'est pas
une supposition — un balayage de tous les `<input>` / `<select>` / `<textarea>` du projet ne trouve
**aucun** contrôle qui s'identifie par `border-line` seul. Le jour où un contrôle de formulaire est
dessiné sur `surface`, il doit prendre `line-strong`, pas descendre le seuil.

**La ligne `emergency` sur `surface-2` a été supprimée plutôt que corrigée.** Elle échouait en dark
(3.89:1 sous le 4.5 AA texte), mais l'élément fautif — la tuile « groupe sanguin » du dashboard —
est en `text-2xl font-black`, donc du *grand texte* où le seuil est 3:1 et où 3.89 passe. Deux
raisons ont donc motivé le changement, et la seconde est la bonne : un groupe sanguin est une
valeur de laboratoire **stable**, pas un état de gravité. Le peindre en rouge annonçait une alerte
clinique qui n'existe pas, et l'IMC juste à côté — tout aussi important — est en `text-ink`. Le
rouge est désormais réservé à l'urgence réelle, comme le veut la règle du domaine. Si un jour une
valeur non urgente doit être mise en avant, elle prend `primary` (5.17:1 en light, 7.02 en dark),
pas `emergency`.

### Filiation de la mesure

`line-strong` = `slate-500` est le **premier** pas de la rampe qui passe : `slate-400` ne fait
que 2.45:1 et se lit comme du texte, pas comme une bordure. De même, en dark, une bordure plus
sombre que le fond du champ l'efface au lieu de le souligner.

---

## Focus

Une seule règle globale, dans `index.css` :

```css
:where(a, button, input, select, textarea, [tabindex]):focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: 0.25rem;
}
```

> **`focus:outline-none` est INTERDIT.** Le sélecteur global est en `:where()`, donc de
> spécificité (0,1,0) ; or `.focus\:outline-none:focus` est en (0,2,0) et **l'emporte** —
> l'anneau disparaît silencieusement, sans erreur de build. Écrire partout
> `focus-visible:outline-none` : même poids, mais il n'est activé qu'au clavier.
> SC 2.4.11 (Focus Not Obscured, WCAG 2.2) : anneau ≥ 2px et ≥ 3:1 vs la couleur adjacente.

---

## Espacement

> **Défauts Tailwind conservés** — pas de `--spacing-*` custom. L'espacement est déjà cohérent
> (`p-3/p-6/p-8`, `gap-6/gap-8`). Seuls rayon, z-index, couleur, ombre et typographie sont entrés
> dans le `@theme`.

---

## Échelle de rayon

| Token | Valeur | Usage |
|---|---|---|
| `rounded-ui-sm` | 0.5rem | inputs, chips |
| `rounded-ui-md` | 1rem | boutons, cartes secondaires |
| `rounded-ui-lg` | 1.5rem | cartes principales, sections |
| `rounded-ui-xl` | 2rem | héros, carte service, bandeau urgence |
| `rounded-full` | 9999px | pills, avatars, boutons circulaires |

> **Le préfixe `ui-` est obligatoire.** `--radius-sm/md/lg/xl` existent déjà comme tailles de rayon
> dans Tailwind. Les redéfinir **réécrit silencieusement ~70 sites d'appel** vers la nouvelle
> valeur. L'espace de noms `ui-` évite la collision ; il n'est pas décoratif.

Cinq valeurs réelles ont été réduites à ces quatre (l'ancien `rounded-[1.5rem]` des bulles de chat
est passé en `ui-lg`).

---

## Ombres

| Token | Usage |
|---|---|
| `shadow-card` | Identity Snapshot, sections Settings |
| `shadow-card-hover` | cartes services Dashboard, carte hôpital |
| `shadow-hero` | hero sombre Dashboard |
| `shadow-elevated` | dropdown médicaments, modales |

L'ex-carte Login en `shadow-xl` « beaucoup trop pour une carte au repos » est passée en `shadow-card`.

---

## Z-index

| Layer | Value | Usage |
|---|---|---|
| `z-base` | 0 | — |
| `z-sticky` | 10 | nav Dashboard/Settings, footer Save Settings collant |
| `z-dropdown` | 20 | dropdown médicaments |
| `z-emergency` | 30 | **bandeau d'urgence — au-dessus de la nav et du composer** |
| `z-modal` | 40 | modales |

Le bandeau d'urgence passe au-dessus de la barre de saisie : il ne doit **jamais** être
recouvert, c'est une exigence du domaine médical.

---

## Typographie

Aucune `font-family` n'est déclarée : la web est sur la **pile système**. La maquette
`mobile/design.html` utilise Inter mais n'est **pas** branchée.

| Rôle | Taille | Poids | Usage |
|---|---|---|---|
| micro-label | 10px | 900 | labels capitales `tracking-widest` |
| caption | 0.75rem | 500–700 | sous-titres, chips |
| body-sm | 0.875rem | 400–500 | descriptions de cartes |
| body | 1rem | 400 | messages de chat |
| heading-2 | 1.5rem | 900 | titres de cartes |
| display | 3–3.75rem | 900 | hero « Salam, {name} » |
| data | 1.5rem mono | 900 | groupes sanguins, BMI, coordonnées |

`MicroLabel` (`DashboardPage.jsx:19`) applique `text-ink-subtle` par défaut ; sur le hero et la carte
hôpital il est **surchargé** par `!text-on-hero-muted` / `!text-on-primary-muted`, car ces deux
surfaces ne portent pas `ink-subtle`.

> **Décision en attente** : Inter partout, ou pile système ? Non tranché — voir § Décisions.

---

## Bascule de thème

- Mécanique : classe `.dark` sur `<html>` via `@custom-variant dark (&:where(.dark, .dark *))`,
  pas seulement une media query — c'est ce qui permet le basculement manuel.
- Persistance : `localStorage['najdda-theme']` ∈ `light` | `dark` | `system`.
- **Premier paint** : script inline dans `frontend/index.html` **avant** React (ligne 14-16), sinon
  flash blanc en dark.
- `color-scheme: light dark` sur `:root`/`.dark` pour que scrollbars et UI natives suivent.
- Toggle : icône Sun/Moon dans la nav + une ligne dans Settings, avec `aria-pressed`/`aria-label`.
- **Le thème ne change jamais la présence ni la position d'une information d'urgence.**

---

## Réduction de mouvement

Bloc global `@media (prefers-reduced-motion: reduce)` en fin d'`index.css` : neutralise animations,
transitions et `scroll-behavior`.

---

## Pièges React vérifiés sur ce projet

Documents ajoutés parce qu'ils ont coûté un vrai bug, pas parce qu'ils sont théoriques.

1. **Une région live vide au premier rendu.** Le `<p role="status">` du stepper est sous le
   `if (loading) return …`. L'effet d'annonce écrivait `ref.current.textContent` pendant le
   chargement, quand `ref.current` est encore `null`, et comme `loading` n'était pas dans le
   tableau de dépendances l'écriture n'était jamais rejouée : **le stepper s'ouvrait en silence
   définitivement**. Le correctif est d'ajouter la garde de rendu (`loading`) aux dépendances —
   pas de supprimer l'effet. (`CompleteProfilePage.jsx:274`)
2. **Un clic n'avance pas forcément le stepper.** Une porte de validation avale le clic sans
   erreur. Tout script de test doit **lire le numéro d'étape après chaque clic** et l'asserter ;
   ne jamais faire confiance au nom de fichier de la capture.
3. **Ordre des classes dans une même chaîne.** `field` interpolé *avant* `w-1/3` se fait
   écraser selon la **position dans la chaîne**, pas selon le site d'appel. D'où le découpage
   `fieldBase` (sans largeur) + utilitaire de largeur explicite.
4. **Tailwind scanne le texte source, pas les valeurs à l'exécution.** Un nom de classe
   construit par interpolation de template ne compile pas. Les tables de classes doivent être
   des objets littéraux statiques.

---

## Décisions en attente (non tranchées)

Les cinq questions ont été tranchées le 2026-09-27 avec les valeurs recommandées. La colonne
« Statut » indique ce qui a réellement été fait, pas ce qui a été proposé.

| # | Question | Valeur retenue | Statut |
|---|---|---|---|
| 1 | Inter partout ou pile système ? | **Pile système** | appliqué — aucune police web, `font-sans` = pile système |
| 2 | Thème par défaut ? | **`system`** | appliqué — le script inline d'`index.html` résout `system` avant le premier rendu |
| 3 | Valeurs de l'enum `preferredLanguage` | **Reprendre `LANGUAGES` du backend** | appliqué — `<select>` branché sur la liste de l'API dans l'assistant (étape 1) et les Réglages |
| 4 | Modale de confirmation sur Remove / Clear ? | **oui pour toute suppression de données de santé** | **différé** — `window.confirm` reste en place |
| 5 | Streaming des réponses ? | **différé explicitement** | assumé — l'attente est honnête, mais le spinner ne dit pas « l'agent écrit » |

Sur #1 et #2, la pile système n'est pas seulement un gain de bundle : sur le web, Inter ne se
charge que si elle est hébergée (propre ou CDN), donc ajoutée à la liste des polices système. Tant
qu'aucune maquette n'impose la marque, une pile système est la seule option qui ne coûte pas de
requête réseau. Mesuré sur le site en cours : `document.fonts` est vide — zéro police web, zéro
requête réseau pour la typographie.

Sur #4, `window.confirm` est un garde-fou acceptable mais **juste** : il n'est ni stylé, ni
localisé correctement à l'écran, et il bloque le thread. Une modale accessible (focus piégé,
`aria-modal`, retour au bouton déclencheur) est le vrai travail ; le remplacer est justifié, mais
pas en même temps que six autres chantiers.

---

## Reste à faire

- ~~**i18n FR/EN**~~ : **fait le 2026-09-27.** 168 clés dans chaque dictionnaire, parité exacte
  vérifiée par `npm run i18n:check`. Bascule FR/EN pilotée sur les 6 pages, `<html lang>` suit.
  Voir la section « Internationalisation » plus haut.
- ~~**Valeurs d'enum en anglais dans l'UI française**~~ : **fait le 2026-09-27.**
  `src/features/i18n/valueLabels.js` porte un libellé FR/EN pour les **50 valeurs** des 9 enums
  (`CHRONIC_CONDITIONS`, `GENDERS`, `RELATIONSHIPS`, `LANGUAGES`, `INSURANCE_MOROCCO`,
  `ALLERGIES.DRUGS/FOOD`, `LIFESTYLE.SMOKING/ALCOHOL`), couverture vérifiée contre
  `backend/src/core/constants.js` (test `/tmp/check_values.py` : 0 valeur non couverte). La
  séparation est stricte : `value=` garde la valeur brute du back (rien n'est écrit « Homme » dans
  la base), seul le libellé affiché change — vérifié sur le DOM réel dans les deux langues.
  > Le vrai **long terme** reste des constantes bilingues servies par l'API : ce serait à la fois
  > plus fin (arabe / darija / tamazight pour les pays de l'Algérie et de la Tunisie) et ça
  > supprimerait ce tableau à maintenir côté frontend. En attendant, le tableau est épuisement
  > contrôlé, pas improvisé.
- ~~**`preferredLanguage` n'est jamais rendu**~~ : **fait le 2026-09-27.** `<select>` sur la
  liste `LANGUAGES` déjà exposée par l'API, dans l'assistant (étape 1) et dans les Réglages,
  avec texte d'aide associé via `aria-describedby`. Il faut distinguer cette « langue de réponse »
  de la langue de l'interface — les deux bascules coexistent et c'est voulu (un Marocain peut lire
  l'interface en français et vouloir les réponses du médecin en darija).
- **Tokens `warning*` déclarés mais non consommés** : aucun composant ne les référence pour
  l'instant. Ce n'est pas une erreur, mais ils ne sont pas couverts par une capture.
- **`frontend/src/App.css`** : fichier vide (0 octet) et non importé — suppression sûre.
- **`frontend/DESIGN.md`** : non écrit ; ce document en tient lieu pour l'instant.
- **App Expo** : 17 fichiers, 789 valeurs hexadécimales en dur, aucune couche de thème. Les
  jetons de `index.css` n'ont pas d'équivalent mobile ; le travail est à faire, pas à recopier.

---

## Annexe — mesure

Les ratios ci-dessus proviennent de `/tmp/measure_tokens.py`, qui lit les variables **réellement
résolues** dans le navigateur (`getComputedStyle(document.documentElement)`) et non les valeurs
écrites dans le fichier — donc le thème est vérifié tel qu'il est rendu, pas tel qu'il est déclaré.

> Note : Tailwind 4 n'émet une variable `@theme` qu'une fois qu'une classe l'utilise. Un token
> déclaré mais jamais consommé lit donc `''` via `getComputedStyle` ; le script retombe alors sur
> le texte de la feuille de style.
