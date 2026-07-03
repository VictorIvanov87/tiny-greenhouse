# Tiny Greenhouse — Frontend

React 19 single-page dashboard for the [Tiny Greenhouse](../README.md) system. Shows live telemetry charts, a timelapse viewer, alerts/notifications, an AI growing assistant, and a setup wizard. Talks to the [backend REST API](../backend/README.md) and uses Firebase for authentication and the user profile.

## Stack

- **React 19** + **React Router 7**
- **Vite 7** — dev server (port `5173`, `strictPort`)
- **TanStack Query v5** — all server state
- **Tailwind CSS 4** + **Flowbite React** — dark-theme-first UI
- **Recharts 3** — time-series charts
- **Firebase Web SDK** — Auth (Email/Password + Google) and client Firestore (user profile)

## Prerequisites

- Node.js 22+ (see [`../.nvmrc`](../.nvmrc))
- A running backend (see [../backend/README.md](../backend/README.md)) — defaults to `http://localhost:3000`
- A Firebase project (free tier) with Authentication and Firestore enabled

## Setup

```bash
cp .env.example .env.local
# Fill in the Firebase web config (Firebase Console → Project Settings → Your apps → Web app)
npm install
npm run dev            # → http://localhost:5173
```

> The app **requires** a Firebase project: it gates on login and reads/writes the signed-in user's
> profile via the client Firestore SDK. Without valid `VITE_FIREBASE_*` values it throws at startup.

## Environment variables

All are `VITE_`-prefixed and embedded into the client bundle at build time (see `.env.example`):

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | Backend origin; `/api` is appended in code. Default `http://localhost:3000` |
| `VITE_APP_NAME` | Display name |
| `VITE_FIREBASE_API_KEY` | Firebase web config (public, but keep out of git) |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase web config |
| `VITE_FIREBASE_PROJECT_ID` | Firebase web config |
| `VITE_FIREBASE_APP_ID` | Firebase web config |

There are **no secrets** in the frontend — Firebase web keys are public by design.

## Scripts

```bash
npm run dev        # Vite dev server on :5173
npm run build      # tsc -b && vite build → dist/
npm run preview    # serve the production build locally
npm run lint       # ESLint (flat config)
```

## Project structure

```
src/
  app/         providers, routes, AppShell
  features/    one folder per page (auth, setup, dashboard, telemetry,
               timelapse, alerts, notifications, assistant, settings, ...)
  shared/      ui components, hooks, utils, config (API base URL)
  theme/       design tokens
  styles/      global CSS
```

See [`CLAUDE.md`](CLAUDE.md) in this folder for detailed UI/component conventions (button patterns, Flowbite usage, dark-theme rules, data-fetching patterns).
