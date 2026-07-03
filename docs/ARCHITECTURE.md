# Architecture — Tiny Greenhouse

End-to-end overview of how the pieces fit together. For per-area detail see the `README.md`/`CLAUDE.md` in each folder.

## System at a glance

```
┌─────────────┐   MQTT/TLS 8883    ┌──────────────┐  Event Hub   ┌───────────────┐
│  ESP32       │  device twins →    │ Azure IoT Hub │  endpoint →  │  Backend      │
│  sensors     │ ─────────────────▶ │              │ ───────────▶ │  (Fastify)    │
└─────────────┘                     └──────────────┘              │               │
┌─────────────┐   HTTP JPEG upload                                │  REST /api/*  │
│  ESP32-CAM   │ ───────────────────────────────────────────────▶│  OpenAPI /docs│
└─────────────┘                                                   └───────┬───────┘
                                                                          │ REST + JSON
                                        Firebase Auth (login) ─┐          ▼
                                        Client Firestore ──────┼─▶ ┌───────────────┐
                                        (user profile)         └── │  React SPA    │
                                                                   │  dashboard    │
                                                                   └───────────────┘
```

Diagrams (in [`diagrams/`](diagrams/)):
- [`tiny-greenhouse-system-architecture.png`](diagrams/tiny-greenhouse-system-architecture.png) — component overview
- [`tiny-greenhouse-dataflow.png`](diagrams/tiny-greenhouse-dataflow.png) — data flow
- [`tiny-greenhouse-sequence.png`](diagrams/tiny-greenhouse-sequence.png) — request sequence
- `IoT Hub Telemetry Pipeline-*.png` — the telemetry ingestion path

## Components

### Frontend (`frontend/`)
React 19 SPA (Vite, Tailwind, Flowbite, TanStack Query, Recharts). Authenticates with **Firebase Auth** and stores the signed-in user's profile in **client Firestore** (`users/{uid}`). All greenhouse data comes from the backend REST API at `VITE_API_BASE_URL + /api`. There is no mock mode — it needs a Firebase project.

### Backend (`backend/`)
Fastify + TypeScript, ESM. Zod schemas are the single source of truth for validation and are shared via `src/lib/schemas.ts`. Every response uses the envelope `{ ok: true, data }` / `{ ok: false, error }`. OpenAPI UI at `/docs`. Two independent mode switches decouple it from cloud dependencies:

| Switch | `mock` (default) | `firebase` / `firestore` |
|--------|------------------|--------------------------|
| `AUTH_MODE` | no JWT; identity from headers | verifies Firebase ID tokens |
| `STORAGE_MODE` | in-memory + JSON fixtures (`data/mock/`) | persists to Firestore |

Because of this, the backend runs with **zero credentials** in mock mode. Every service that writes to Firestore also implements a mock path.

### AI assistant / RAG
`/api/assist` answers growing questions using retrieval-augmented generation: a knowledge base under `data/rag/` is embedded into a **pgvector** store (`DATABASE_URL`), and an LLM (OpenAI by default; Ollama or Azure OpenAI are pluggable via `LLM_PROVIDER`/`EMBED_PROVIDER`) generates the answer. Seed the store once with `npm run rag:seed`.

### Firmware (`hardware/`)
Two ESP32 boards. The sensor board reads BME280/BMP280 + BH1750 + ADS1115 soil channels, drives fan/pump/light actuators, and **publishes telemetry to Azure IoT Hub over MQTT** with device twins. The camera board captures JPEGs on twin command and uploads them to the backend over HTTP. Credentials live in a git-ignored `secrets.h`. See [../hardware/README.md](../hardware/README.md).

## Telemetry ingestion path

1. ESP32 publishes a telemetry message to Azure IoT Hub (MQTT/TLS).
2. The backend's IoT Hub consumer (`src/iot/consumer.ts`, started only when `IOT_HUB_ENABLED=true`) reads from the hub's Event Hub-compatible endpoint.
3. Telemetry is attributed to an owner via `lookupDevice(deviceId)` (a device must be registered via `POST /api/devices`) and stored (Firestore in production, memory/JSON in mock).
4. The SPA reads it back through the REST API and renders charts.

> **Ownership gotcha:** telemetry `ownerId` is derived from the registered device, not the logged-in
> user. An empty dashboard usually means the signed-in uid doesn't match the device's `ownerId`.

For local development you can skip IoT Hub entirely: keep `IOT_HUB_ENABLED=false` and use mock data, or POST telemetry directly to the backend.

## External services (all optional in dev)

| Service | Used for | Enabled by |
|---------|----------|-----------|
| Firebase Auth + Firestore | Login, user profile, production storage | `AUTH_MODE`/`STORAGE_MODE`, frontend `VITE_FIREBASE_*` |
| Azure IoT Hub | Real device telemetry | `IOT_HUB_ENABLED=true` + `IOT_HUB_*` |
| Azure Blob Storage | Camera image storage (firestore mode) | `AZURE_STORAGE_*` |
| Postgres + pgvector | RAG vector store | `DATABASE_URL` |
| OpenAI / Ollama / Azure OpenAI | Assistant LLM + embeddings | `LLM_PROVIDER` / `EMBED_PROVIDER` |

## Deployment

Backend → Azure App Service; frontend → Firebase Hosting; CI in `.github/workflows/deploy.yml` on push to `main`. See the [root README deployment section](../README.md#deployment) for the placeholders and secrets a fork must set.
