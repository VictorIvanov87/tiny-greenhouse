# AGENTS.md — Tiny Greenhouse (frontend)

> Operating notes for Codex/agents and humans. Keep behavior predictable, diffs small, and structure consistent.

---

## 1) Setup & Run

- **Install:** `npm i`
- **Dev server:** `npm run dev` → Vite at `http://localhost:5173`
- **Build:** `npm run build` → output in `dist/`
- **Lint:** `npm run lint`
- **Typecheck:** `npm run typecheck` (or `tsc --noEmit` if missing)

**Stack:** React + Vite + TypeScript + Tailwind + Flowbite React.  
**Note:** API calls go to `/api/*` (proxied in dev). Never put secrets/keys in client code.

---

## 2) Tech & Paths

- UI libraries: **Tailwind**, **Flowbite React** (see `tailwind.config.js` for `content` and `plugins: [require('flowbite/plugin')]`).
- Routing/data: **react-router-dom**, (optional) **@tanstack/react-query**.
- Structure: **domain-sliced** — features in `src/features/*`; shared utilities/hooks/components in `src/shared/*` and `src/hooks/*`.

---

## 3) CODEMAP (frontend)

```
src/
  app/
    App.tsx                # Shell layout and navigation
    routes.tsx             # React Router config
    providers.tsx          # Global providers (QueryClient, Theme), if used
  features/
    dashboard/
      DashboardPage.tsx    # Cards/charts for key metrics
    telemetry/
      api.ts               # fetchTelemetry(); types and adapters
      TelemetryPage.tsx    # Table + chart for telemetry
    alerts/
      AlertsPage.tsx       # Alerts feed and status badges
    timelapse/
      TimelapsePage.tsx    # Gallery/player for timelapse frames
    settings/
      SettingsPage.tsx     # User/device settings
  shared/
    ui/                    # Thin wrappers over Flowbite components
    hooks/
      useApi.ts            # Axios instance + helpers
    utils/
      formatters.ts        # Format dates/units
  styles/
    index.css              # Tailwind layers (base/components/utilities)
```

**Rule:** new screen → `src/features/<feature>/<Feature>Page.tsx` plus local helpers in the same folder.

---

## 4) Tasks Codex Can Do

- Create a new page: `src/features/devices/DevicesPage.tsx` with a Flowbite table and pagination.
- Add an API module: `src/features/<feature>/api.ts` with `get<Feature>()` (Axios → `/api/<feature>`), error/loading handling.
- Implement a chart in `DashboardPage.tsx` from mock `/api/telemetry` and add time-window filters (1h/6h/24h).
- Refactor a shared UI component in `src/shared/ui/*` without breaking its public API.
- Fix Tailwind classes for mobile (<640px) layout issues.

**PR description (short):**

- Summary (1–3 sentences); Screenshots/GIF for UI; How to test (1–2 commands); Risks/Out-of-scope.

---

## 5) Constraints (important for agents)

- **Do not add secrets/keys** to client code or `.env` in the frontend.
- **Do not modify backend/hardware** from a frontend PR. If needed, state requirements in the PR.
- Follow the **codemap** and naming: `FeaturePage.tsx`, `api.ts`, `useXyz.ts`.
- Prefer **Flowbite React** components; use Tailwind classes for fine adjustments.

---

## 6) Coding Style & Conventions

- TypeScript **strict**; avoid `any` unless temporary.
- Names: **PascalCase** for components; **camelCase** for functions/vars.
- Co-locate component files with feature-specific helpers.
- Formatting: **Prettier** defaults (2 spaces, semicolons, single quotes).
- CSS: Tailwind classes; global styles only in `styles/`.
- Imports: relative within a feature; configured aliases if present.

---

## 7) Smoke Checks (before PR)

- `npm run dev` starts with no red console errors.
- Data states handled: empty/loading/error.
- Responsive at **sm/md/lg** without horizontal scroll.
- Lint and types pass (`npm run lint`, `npm run typecheck`).

---

## 8) Testing (minimal)

- No unit tests for now. For new pages, provide **inline mocks** and a short note in the PR on how to view the screen.

---

## 9) Commit & PR Guidelines

- Commits: **imperative** mood; optional scope (`frontend: add TelemetryPage`). Avoid “wip”.
- Aim for PRs ≤ ~400 lines diff; split larger changes.
- Put TODO/Out-of-scope in the PR description instead of `// TODO:` in code.
- Do not auto-format unrelated files.

---

## 10) Known Pitfalls

- **Tailwind/Flowbite not working:** check `tailwind.config.js` `content` globs (include `node_modules/flowbite-react/lib/esm/**/*.js` and `node_modules/flowbite/**/*.js`) and `require('flowbite/plugin')`.
- **Fonts/icons missing:** ensure global styles are imported in `src/styles/index.css` and loaded in `main.tsx`.
- **CORS/proxy:** dev expects `/api` proxy; if backend is absent, pages should use mock data.

---

## 11) Glossary

- **Feature Page** — main screen component (`<Feature>Page.tsx`).
- **Shared UI** — reusable wrappers over Flowbite components.
- **API module** — `api.ts` per feature, with typed request helpers.

---

## 12) Out of Scope

- Routing/nav outside `app/routes.tsx`.
- Global styles outside `styles/`.
- Adding new runtime deps without justification (explain in PR).

---

_If structure or rules change, update this file’s CODEMAP and relevant sections to keep agents aligned._

## 13) LLM context sources for Flowbite React (read these before generating UI)

- LLM-optimized endpoints (short vs. full):
  • https://flowbite-react.com/llms.txt — concise, token-friendly summary of docs.
  • https://flowbite-react.com/llms-full.txt — full docs dump for richer context.

- Markdown versions of component docs:
  • Append .md to any docs URL to get pure markdown. Examples:
  • https://flowbite-react.com/docs/getting-started/introduction.md
  • https://flowbite-react.com/docs/components/button.md
  • https://flowbite-react.com/docs/components/table.md
  • https://flowbite-react.com/docs/components/card.md
  • https://flowbite-react.com/docs/components/navbar.md
  • https://flowbite-react.com/docs/customize/theme.md

- When generating or refactoring UI:
  1. Fetch llms.txt (or the specific .md pages for the components you’ll use) and ground code to that API/props surface.
  2. Prefer Flowbite React components (Button, Card, Table, Navbar, Sidebar, Modal, Alert) and add Tailwind classes only for layout/spacing.
  3. Respect our layout rules (full-height shell): render pages inside <main> of AppShell, use min-h-screen flex flex-col on the root, and center forms with flex items-center justify-center.
  4. Use the project palette: evergreen (primary), moss (secondary), sage (bg), soil (text/accents), sunlight (warn), chili (error).
  5. Mobile first: no horizontal scroll at sm/md/lg; use container mx-auto px-4 and sensible max-w-\* on forms/cards.

⸻
