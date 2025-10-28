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
