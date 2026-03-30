# CLAUDE.md — Tiny Greenhouse (root)

Autonomous mini-greenhouse monitoring system: ESP32 sensor/camera firmware → Fastify REST API → React SPA dashboard.

## Monorepo layout

```
backend/      Node.js + TypeScript + Fastify API  (port 3000)
frontend/     React 19 + Vite + Tailwind SPA      (port 5173)
hardware/     PlatformIO ESP32 firmware (main + cam)
docs/         Task tickets (TG-xxx.md), diagrams
scripts/      Dev utilities (secret scanning pre-commit hook)
data/         Shared mock telemetry / timelapse JSON
```

Each subdirectory has its own CLAUDE.md with area-specific conventions.

## Running everything locally

```bash
# Backend
cd backend && npm run dev        # tsx watch → http://localhost:3000
                                 # OpenAPI UI: http://localhost:3000/docs

# Frontend
cd frontend && npm run dev       # Vite → http://localhost:5173

# Firmware (PlatformIO)
cd hardware/esp32-firmware && pio run -t upload
cd hardware/esp32-cam-firmware && pio run -t upload
```

## Key environment variables

Both backend and frontend expect `.env` copied from `.env.example`. Backend `.env` is the only one with secrets (Firebase, OpenAI, Azure). Frontend has no secrets.

## Auth & storage modes (backend)

| Var | Values | Effect |
|-----|--------|--------|
| `AUTH_MODE` | `mock` / `firebase` | `mock` skips JWT; `firebase` verifies Firebase ID tokens |
| `STORAGE_MODE` | `mock` / `firestore` | `mock` uses in-memory + JSON files; `firestore` persists to Firebase |

Default for local dev: both `mock`.

## Conventions across the whole repo

- TypeScript strict everywhere; no `any` in public types
- All API responses use `{ ok: true, data }` / `{ ok: false, error: { code, message } }`
- Zod schemas are the single source of truth — shared via `backend/src/lib/schemas.ts`
- Never commit `.env` files; `scripts/check-secrets.sh` runs as a pre-commit hook
- Task tickets live in `docs/tasks/TG-NNN.md` — open one before starting non-trivial work

## Firebase deployment

```bash
firebase deploy          # deploys hosting (frontend build) + Firestore rules
firebase deploy --only hosting
```
