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
- `POST /api/rag/search` (dev/debug only; guarded by `RAG_DEBUG`)
- `POST /api/assist`

## API Documentation

When running `npm run dev`, visit `http://localhost:3000/docs` for interactive Swagger UI (OpenAPI 3).

In mock mode you may scope state per user by setting `X-User-Id` (and optional `X-User-Email`) headers.

## AI / RAG plumbing

- Configure `VECTOR_STORE=pgvector`, `DATABASE_URL`, and (optionally) `DATABASE_SSL` to point at your Supabase Postgres instance.
- Supply `OPENAI_API_KEY` along with `EMBED_PROVIDER`, `EMBED_MODEL`, `LLM_PROVIDER`, and `LLM_MODEL` (defaults target OpenAI `text-embedding-3-small` + `gpt-4o-mini`).
- `RAG_TOP_K`, `ASSIST_INPUT_LIMIT`, and `RAG_DEBUG` tune retrieval depth, message guard rails, and whether the `/api/rag/search` debug route is exposed.
- See `docs/rag/seed-pack.md` for the content format under `data/rag/`. After editing files there, re-run `npm run rag:seed` to recreate embeddings.
- Health checks: `GET /api/health/ai` pings the vector store, embedding provider, and LLM provider.
