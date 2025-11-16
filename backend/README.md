# Tiny Greenhouse Backend

Minimal Fastify backend scaffold for Tiny Greenhouse.

## Commands

- `npm install`
- `npm run dev` — start Fastify with hot reload
- `npm run typecheck` — run TypeScript in no-emit mode
- `npm run build` — bundle with tsup
- `npm start` — run compiled output from `dist/`
- `npm run rag:seed` — chunk YAML/Markdown seed packs and upsert them into `rag_chunks`

## Environment

Copy `.env.example` to `.env` and adjust values as needed.

Key variables:

- `AUTH_MODE=mock` for local development (synthetic `uid` via `x-user-id` header)
- `AUTH_MODE=firebase` with `FIREBASE_*` credentials for real token verification

## Available Endpoints

- `GET /api/health`
- `GET /api/telemetry?from&to&limit&sensor`
- `GET /api/timelapse?limit`
- `GET /api/greenhouses/current`
- `GET /api/notifications`
- `PUT /api/notifications`
- `GET /api/health/ai`
- `GET /api/crops/:cropId/:variety/defaults`
- `POST /api/rag/search` (dev/debug only; guarded by `RAG_DEBUG`)
- `POST /api/assist`

## API Documentation

When running `npm run dev`, visit `http://localhost:3000/docs` for interactive Swagger UI (OpenAPI 3).

In mock mode you may scope state per user by setting `X-User-Id` (and optional `X-User-Email`) headers.

## AI / RAG plumbing

- Configure `VECTOR_STORE=pgvector`, `DATABASE_URL`, and (optionally) `DATABASE_SSL` to point at your Supabase Postgres instance.
- Supply `OPENAI_API_KEY` along with `EMBED_PROVIDER`, `EMBED_MODEL`, `LLM_PROVIDER`, and `LLM_MODEL` (defaults target OpenAI `text-embedding-3-small` + `gpt-4o-mini`).
- `RAG_TOP_K`, `ASSIST_INPUT_LIMIT`, `ASSIST_MIN_QUERY_LEN`, `RAG_SCORE_FLOOR`, and `RAG_DEBUG` tune retrieval depth, small-talk guards, and whether the `/api/rag/search` debug route is exposed (when `RAG_DEBUG=true` you also get extra metadata in `/api/assist` responses).
- See `docs/rag/seed-pack.md` for the content format under `data/rag/`. After editing files there, re-run `npm run rag:seed` to recreate embeddings.
- Health checks: `GET /api/health/ai` pings the vector store, embedding provider, and LLM provider.

## Assistant endpoint (/api/assist)

Request body (JSON):

- `message` (string, required) — user question (max `ASSIST_INPUT_LIMIT`, default 800 chars).
- `cropId` (string, optional) — override the greenhouse crop ID when you want to target another crop.
- `variety` (string, optional) — hint variety for the answer/snapshot.
- `topK` (int 1–12, optional, default 6) — number of RAG chunks to retrieve.
- `temperature` (0–1, optional, default 0.2) — LLM sampling temperature.

Unknown keys are rejected with `400`.

### Examples

Plain request (uses greenhouse context):

```bash
curl -X POST http://localhost:3000/api/assist \
  -H 'Content-Type: application/json' \
  -H 'X-User-Id: demo' \
  -d '{ "message": "How are humidity levels looking today?" }'
```

Targeted request with overrides (crop + variety + tuning):

```bash
curl -X POST http://localhost:3000/api/assist \
  -H 'Content-Type: application/json' \
  -H 'X-User-Id: demo' \
  -d '{
    "message": "Best light hours for Basket of Fire seedlings?",
    "cropId": "chillies",
    "variety": "basket-of-fire",
    "topK": 6,
    "temperature": 0.2
  }'
```

Small-talk guard (short/weak prompts return a generic greenhouse help reply with no citations):

```bash
curl -X POST http://localhost:3000/api/assist \
  -H 'Content-Type: application/json' \
  -H 'X-User-Id: demo' \
  -d '{ "message": "hello" }'
```

Set `ASSIST_MIN_QUERY_LEN` (default `8`) to tune how short a prompt counts as small-talk, and `RAG_SCORE_FLOOR` (default `0.20`) to control the retrieval confidence floor. With `RAG_DEBUG=true` you can also inspect the effective targeting/temperature under `meta.options` in the response and hit `POST /api/rag/search` for raw retrieval debugging.

## Crop defaults endpoint (/api/crops/:cropId/:variety/defaults)

Deterministic view of the YAML seed pack for a specific crop/variety pair. Files are loaded from `data/rag/crops/<cropId>/<variety>/<variety>.yaml` (with a fallback to `data/rag/crops/<cropId>/<variety>.yaml`). Responses are cached in-memory for `CROP_DEFAULTS_TTL_MS` (default `60000`) unless `RAG_DEBUG=true`, which forces reads from disk for easier authoring.

```bash
curl -s http://localhost:3000/api/crops/chillies/prairie-fire/defaults | jq
```

Sample payload:

```json
{
  "ok": true,
  "data": {
    "cropId": "chillies",
    "variety": "prairie-fire",
    "lang": "en",
    "displayName": "Prairie Fire",
    "overview": "Compact ornamental chilli that loads up ...",
    "defaults": {
      "environment": {
        "temperature_day": "22-28 °C",
        "temperature_night": "18-22 °C",
        "humidity": "45-60 %",
        "light_hours": "14"
      },
      "irrigation": {
        "method": "Top watering or simple drip",
        "frequency": "Water when top 1–2 cm are dry; avoid constant saturation"
      },
      "container": {
        "volume_liters": "1.5-3 L"
      }
    },
    "safety_bounds": {
      "temperature_c": { "min": 10, "max": 38 },
      "humidity_pct": { "min": 25, "max": 80 }
    },
    "stages": [
      { "id": "germination", "label": "Germination" },
      { "id": "seedling", "label": "Seedling" }
    ]
  }
}
```
