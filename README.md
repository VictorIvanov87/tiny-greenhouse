# Tiny Greenhouse

**An autonomous home mini-greenhouse with a web dashboard, an AI growing assistant, and ESP32 IoT hardware.**

Tiny Greenhouse monitors a small indoor growing environment (temperature, humidity, soil moisture, light), captures a timelapse of plant growth, applies simple control rules, and explains its readings and decisions in natural language. It was built as a thesis prototype and is shared here for educational use under the [MIT License](LICENSE).

---

## What's in the box

| Layer | Tech | Port | Directory |
|-------|------|------|-----------|
| **Frontend** | React 19 + Vite + Tailwind (SPA dashboard) | `5173` | [`frontend/`](frontend/) |
| **Backend** | Node.js + TypeScript + Fastify (REST API + OpenAPI) | `3000` | [`backend/`](backend/) |
| **Firmware** | ESP32 (PlatformIO / Arduino) — sensors + camera | — | [`hardware/`](hardware/) |

```
backend/    Fastify REST API + AI assistant (RAG)   → see backend/README.md
frontend/   React SPA dashboard                     → see frontend/README.md
hardware/   ESP32 sensor + camera firmware          → see hardware/README.md
docs/       Architecture, diagrams, task tickets    → see docs/ARCHITECTURE.md
data/       Shared RAG knowledge base + mock data
scripts/    Dev utilities (secret-scanning hook)
```

**Data flow:** ESP32 sensors → **MQTT/TLS → Azure IoT Hub** → backend consumer → storage → REST API → React dashboard. The ESP32-CAM uploads JPEG snapshots to the backend for the timelapse. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full picture.

---

## Prerequisites

- **Node.js 22+** and npm (see [`.nvmrc`](.nvmrc) — run `nvm use` if you use nvm)
- **A Firebase project** (free tier) — required to run the frontend, which gates on login and stores the user profile in Firestore
- **PlatformIO** — only if you want to build/flash the ESP32 firmware
- *Optional, per feature:*
  - **OpenAI API key** + **Postgres w/ pgvector** (e.g. Supabase) — for the AI assistant / RAG endpoints
  - **Azure IoT Hub** + **Azure Blob Storage** — for real hardware telemetry & camera uploads in production

The **backend runs fully in mock mode with zero credentials** — the core dashboard, telemetry, timelapse, and notifications work out of the box. Cloud accounts are only needed for the features listed above.

---

## Quick start (local dev)

Start the **backend first**, then the frontend.

### 1. Backend (mock mode — no credentials needed)

```bash
cd backend
cp .env.example .env      # defaults are AUTH_MODE=mock, STORAGE_MODE=mock
npm install
npm run dev               # → http://localhost:3000
```

- API base: `http://localhost:3000/api`
- Interactive API docs (Swagger UI): `http://localhost:3000/docs`
- Health check: `http://localhost:3000/api/health`

Mock mode serves telemetry/timelapse/greenhouse/notifications from JSON fixtures in `backend/data/mock/` — no database or cloud services required.

### 2. Frontend

The frontend requires a Firebase project because login and the user profile use Firebase Auth + client Firestore.

```bash
cd frontend
cp .env.example .env.local
# Fill in VITE_FIREBASE_* from Firebase Console → Project Settings → Your apps → Web app.
# Leave VITE_API_BASE_URL=http://localhost:3000 to talk to your local backend.
npm install
npm run dev               # → http://localhost:5173
```

To get the Firebase values: create a free project at the [Firebase Console](https://console.firebase.google.com/), enable **Authentication** (Email/Password and Google), enable **Firestore**, then register a **Web app** and copy its config into `.env.local`. Update [`.firebaserc`](.firebaserc) with your project ID if you plan to deploy.

### 3. Firmware (optional)

See [hardware/README.md](hardware/README.md) for wiring, IoT Hub device provisioning, and flashing. In short: copy `secrets.example.h → secrets.h` in each firmware folder, fill in Wi-Fi + Azure IoT Hub values, then `pio run -t upload`.

---

## Configuration

Each app is configured entirely through environment variables; the committed `*.example` files document the full schema.

| App | Copy from → to | Notes |
|-----|----------------|-------|
| Backend | `backend/.env.example` → `backend/.env` | Secrets marked `# SECRET`; only needed for non-mock modes |
| Frontend | `frontend/.env.example` → `frontend/.env.local` | `VITE_*` values are baked into the client bundle at build time |
| Firmware | `hardware/*/src/secrets.example.h` → `secrets.h` | Wi-Fi + Azure IoT Hub credentials |

**Backend mode switches** (both default to `mock` for local dev):

| Var | Values | Effect |
|-----|--------|--------|
| `AUTH_MODE` | `mock` / `firebase` | `mock` skips JWT (identity from `x-user-id` header); `firebase` verifies Firebase ID tokens |
| `STORAGE_MODE` | `mock` / `firestore` | `mock` uses in-memory + JSON files; `firestore` persists to Firebase |

The AI assistant endpoints (`/api/assist`) additionally need `OPENAI_API_KEY` and a pgvector `DATABASE_URL`; run `npm run rag:seed` once to populate the vector store. See [backend/README.md](backend/README.md) for the full endpoint reference.

---

## Secrets & safety

- `backend/.env`, `frontend/.env.local`, and `hardware/**/secrets.h` are **git-ignored** and must never be committed. The `.example` templates are the only versions in git.
- A lightweight scanner at [`scripts/check-secrets.sh`](scripts/check-secrets.sh) blocks common credential patterns (private keys, API-key prefixes, DB connection strings). **Install it as a pre-commit hook after cloning** (git hooks are local and don't travel with the repo):

  ```bash
  ln -sf ../../scripts/check-secrets.sh .git/hooks/pre-commit
  ```

---

## Deployment

CI in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) deploys the backend to **Azure App Service** and the frontend to **Firebase Hosting** on every push to `main`. To run it on your own infrastructure, replace the placeholders and set the referenced secrets:

| Placeholder / secret | Where | What to set it to |
|----------------------|-------|-------------------|
| `YOUR_FIREBASE_PROJECT_ID` | `.firebaserc`, `deploy.yml` | Your Firebase project ID |
| `YOUR_AZURE_WEBAPP_NAME` | `deploy.yml` | Your Azure Web App name |
| `AZURE_CREDENTIALS`, `FIREBASE_SERVICE_ACCOUNT` | GitHub repo secrets | Service-principal / service-account JSON |
| `VITE_*` | GitHub repo secrets | Frontend build-time Firebase config |
| `BACKEND_URL` (repo *variable*) | used by `keepalive.yml` | Your deployed backend origin (optional; keepalive can be deleted) |

Manual Firebase deploy: `firebase deploy --only hosting` (build the frontend first with `npm run build`).

---

## Documentation map

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — end-to-end system overview
- [backend/README.md](backend/README.md) — API reference, modes, AI/RAG config
- [frontend/README.md](frontend/README.md) — SPA structure and dev workflow
- [hardware/README.md](hardware/README.md) — firmware, wiring, IoT Hub provisioning
- [docs/tasks/](docs/tasks/) — `TG-NNN.md` task tickets (the project's design history)
- `CLAUDE.md` files in each area — conventions and coding patterns

## License

[MIT](LICENSE) © 2026 Victor Hristov
