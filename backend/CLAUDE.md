# CLAUDE.md — Backend

Node.js + TypeScript + Fastify API. Port 3000, OpenAPI UI at `/docs`.

## Stack

- **Fastify 5** + Zod type provider — validation at both input and response
- **TypeScript** strict ESM, target ES2022
- **Firebase Admin** — Firestore (storage) + optional JWT auth
- **Azure Blob Storage** (`@azure/storage-blob`) — camera image uploads
- **OpenAI** — LLM + embeddings for the assistant / RAG features
- **PostgreSQL** (`pg`) — vector store for RAG (pgvector extension)
- **Pino** — structured logging; `req.log.error(err, 'message')` pattern

## Directory map

```
src/
  app.ts              Fastify server setup (plugins → routes)
  plugins/
    auth.ts           JWT preHandler (mock|firebase)
    cors.ts / helmet.ts / logger.ts
  routes/             One file per resource — all under /api/...
  services/           Business logic; called from routes
  lib/
    schemas.ts        All Zod schemas + inferred TS types
    respond.ts        ok() / errorBody() envelope helpers
    firebase.ts       ensureFirebase() lazy singleton
    blob.ts           uploadBlob() — Azure Blob wrapper
    file.ts           readMock() — loads data/mock/*.json
  ai/
    vector-store.ts   Embeddings + pgvector search
    providers.ts      LLM abstraction
  scripts/
    rag-seed.ts       One-off RAG data ingestion
data/mock/            JSON fixtures used by mock storage mode
```

## Commands

```bash
npm run dev          # hot-reload dev server (tsx watch)
npm run typecheck    # must be clean before any commit
npm run build        # ESM output → dist/
npm run rag:seed     # seed RAG vector store
```

## Route recipe

One route per file, registered under `/api/...`, schema on every response:

```ts
// src/routes/example.ts
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { ExampleResponseSchema, ErrorResponseSchema } from '../lib/schemas';
import { ok, errorBody } from '../lib/respond';

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

const exampleRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/api/example',
    {
      preHandler: app.auth,   // omit for unauthenticated routes
      schema: {
        querystring: QuerySchema.strict(),
        response: { 200: ExampleResponseSchema, 400: ErrorResponseSchema },
      },
    },
    async (req, reply) => {
      const q = QuerySchema.parse(req.query);
      // ... call service ...
      return ok({ items: [], total: 0 });
    },
  );
};

export default exampleRoutes;
```

After creating the file, register it in `src/app.ts`.

## Schema recipe

All schemas live in `src/lib/schemas.ts`. Export both the schema and the inferred type:

```ts
export const MyThing = z.object({
  id: z.string(),
  value: z.number(),
});
export type MyThing = z.infer<typeof MyThing>;
export const MyThingResponseSchema = okResponse(MyThing);
```

Use `ISODate` (already defined) for timestamp fields, not `z.string()`.

## Service pattern

Services export plain async functions and own the `STORAGE_MODE` branch:

```ts
const STORAGE_MODE = process.env.STORAGE_MODE ?? 'mock';

export const myFn = async (...): Promise<...> => {
  if (STORAGE_MODE !== 'firestore') {
    return mockResult;   // in-memory or JSON fixture path
  }
  const { db } = ensureFirebase();
  // Firestore path
};
```

Every service that writes to Firestore **must** have a mock path. See `services/telemetry.ts` or `services/camera.ts` as references.

## Device ownership

`lookupDevice(deviceId)` in `services/telemetry.ts` resolves `deviceId → { ownerId, greenhouseId }` without auth. Returns `null` if unregistered — respond 403. Use this in any route that receives hardware uploads.

## Error handling rules

- Validation failure → 400 + `errorBody('SNAKE_CODE', 'human message')`
- Unregistered device / not found → 403 or 404
- External service failure (Azure, Firestore write) → 500
- Blob upload succeeded but Firestore write failed → log + return success (non-fatal)

## Auth modes

| `AUTH_MODE` | Behaviour |
|-------------|-----------|
| `mock` | No token check; `req.user = { uid: 'demo' }` |
| `firebase` | Verifies `Authorization: Bearer <ID_TOKEN>` via firebase-admin; 401 on failure |

Routes that need auth add `preHandler: app.auth` in route options.

## Environment

Copy `.env.example` → `.env`. Secrets required for non-mock modes:

| Variable | Required for |
|----------|-------------|
| `FIREBASE_*` | `AUTH_MODE=firebase` or `STORAGE_MODE=firestore` |
| `AZURE_STORAGE_CONNECTION_STRING` | Camera uploads in firestore mode |
| `AZURE_STORAGE_CONTAINER` | same (default: `camera-images`) |
| `DATABASE_URL` | RAG / pgvector |
| `OPENAI_API_KEY` | Assistant + embeddings |

## Acceptance checklist

- `npm run typecheck` passes clean
- Every route declares `schema.response`
- All inputs validated with Zod; no `any` in public types
- New services have a mock path
- No secrets in code or committed `.env`
