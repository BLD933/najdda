# NAJDDA

Multi-agent medical assistant (React 19 + Vite + Tailwind 4 frontend, Express + LangGraph backend).
Medical domain: every UI change must preserve emergency affordances (emergency banners, 150/112
numbers, severity states) and never hide safety information behind hover/collapsing UI.

## UI skills (installed in `.claude/skills/`)

62 skills installed from 5 GitHub repos. Use them via the Skill tool when touching frontend code.

### Workflow order for UI work

1. **`bootstrapping-design-context`** — first call in any UI session (design docs don't exist yet).
2. **`create-design-md`** — generate `frontend/DESIGN.md` (design tokens + language reference).
3. **Audit**: `anti-slop-audit` (fast pass) or `interface-review` (full review across all dimensions).
4. **Fix by dimension**: `baseline-ui` (quick deslop) / `improve-ui` (deeper), or targeted skills below.
5. **Verify**: `fixing-accessibility` + `fixing-motion-performance`.

### Routing table

| Task | Skill(s) |
|---|---|
| Quick polish pass | `baseline-ui`, `improve-ui` |
| Full review | `better-interface`, `interface-review` |
| Colors / palette / contrast | `better-colors`, `design-tokens-theming` |
| Type scale, fonts | `better-typography`, `visual-hierarchy-and-type` |
| Spacing, alignment, grouping | `better-layout` |
| Copy / wording (FR + AR + EN) | `better-writing`, `precision-copy-and-formatting` |
| WCAG, focus, ARIA, keyboard | `better-accessibility`, `accessible-components`, `fixing-accessibility` |
| Buttons, hit areas, radius, depth | `better-ui` |
| Login / Register flows | `auth-screens`, `onboarding-flows` |
| Profile / settings forms | `forms-and-validation`, `settings-pages` |
| Chat UI states | `empty-and-loading-states`, `notifications-and-toasts`, `designing-states-not-screens` |
| Dashboard / stats cards | `dashboard-layout` |
| Responsive behavior | `responsive-layout` |
| Navigation / routing chrome | `navigation-patterns` |
| Component structure (React) | `component-architecture` |
| AI-slop tells, generic look | `anti-slop-audit` |
| Design rationale debates | `design-judgment-references` |
| Flow/order of screens | `flow-doc-first`, `grilling-ui` |
| HTML meta / OG tags | `fixing-metadata` |
| Animation perf | `fixing-motion-performance` |
| Browser DOM snippets (toast, storage…) | `dom-*`, `toast-notice`, `inject-custom-style` etc. (reference-only, JS in-page) |

### Notes

- `break`, `variant`, `explain-interface`, `interface-review` have `disable-model-invocation: true`
  (manual `/skill` invocation only).
- `ui-skills-root` needs `npx ui-skills` CLI + ui-skills.com MCP (optional, not configured).
- Skills apply only under this repo (`Downloads/najdda/`).

## Frontend layout

- `frontend/src/pages/` — Login, Register, CompleteProfile, Dashboard, Chat, Settings
- `frontend/src/features/auth/` — LoginForm, RegisterForm, AuthContext
- `frontend/src/index.css` — Tailwind 4 entry (`@theme` tokens live here)

## Conventions

- UI strings: French primary (patient-facing), keep medical emergency text unchanged.
- Tailwind 4: use `@theme` custom properties in `index.css`, not a tailwind.config.
- No new runtime deps for UI without asking (keep bundle lean for the mobile WebView build).
