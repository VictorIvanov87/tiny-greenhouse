# Repository Guidelines

## Project Structure & Module Organization

The repo is domain-sliced: `frontend/` hosts the React SPA, with code under `src/` grouped by feature (`src/features/telemetry`, `src/shared`, `src/hooks`). `backend/` contains the Node service; keep route handlers in `src/routes/` and supporting logic in `src/services/`. `data/` stores sample telemetry and timelapse frames for local work, while `docs/` holds ADRs and design notes. Hardware experiments live in `hardware/`; keep generated wiring exports inside package-specific `tmp/` folders ignored by git.

## Build, Test, and Development Commands

Install dependencies once per package: `cd frontend && npm install`, `cd backend && npm install`. Start the SPA with `npm run dev` inside `frontend/`; Vite serves on 5173 and proxies `/api`. Build a production bundle via `npm run build`, outputting to `frontend/dist`. Launch the mock API with `npm run dev` in `backend/` (port 3000). Use `.env.local` files in each package to point the SPA at the local API during integration work.

## Coding Style & Naming Conventions

Use Prettier defaults (2-space indent, semicolons, single quotes) and run `npm run lint` in each package before pushing. Favor TypeScript for new code; name React components in PascalCase (`TelemetryPanel.tsx`) and colocate styles in the same folder. Hooks start with `use` and live in `src/hooks/`. Backend modules export camelCase handler functions from files named after the route (`telemetry.ts`). Keep environment variables uppercase with underscores and document additions in `docs/config.md`.

## Testing Guidelines

We don't need any unit tests for now.

## Commit & Pull Request Guidelines

Commits use the imperative mood with an optional scope (`frontend: add telemetry store`). Keep unrelated work in separate commits and avoid “wip” messages. PRs need a summary, testing notes (command output or screenshots), linked issues, and review callouts for risky sections. Aim for focused diffs under 400 lines; document deferred work in the PR description rather than leaving TODOs in code.
