# AGENTS.md — Tiny Greenhouse (backend)

> Operating guide for backend tasks. Keep changes minimal, typed, and documented. This repo uses **Node.js + TypeScript + Fastify** with Zod validation and Pino logging.

---

## 1) Runtime & Stack
- **Runtime:** Node.js ≥ 20.x (ESM), TypeScript strict
- **Web framework:** Fastify (`@fastify/cors`, `@fastify/helmet`)
- **Docs:** `@fastify/swagger` + `@fastify/swagger-ui` (OpenAPI 3 under `/docs`)
- **Validation:** Zod (input & output schemas)
- **Logging:** Pino (Pretty in dev)
- **Build & dev:** `tsup` (build), `tsx` (dev watcher)
- **Env:** `dotenv` (no secrets in code; use `.env`)

> Do NOT introduce new runtime libraries without updating this file.

---

## 2) Commands
- **Install:** `npm i`
- **Dev:** `npm run dev` → starts Fastify with hot-reload (tsx)
- **Build:** `npm run build` → outputs ESM to `dist/`
- **Start:** `npm start` → runs `node dist/app.js`
- **Lint/Typecheck:** `npm run typecheck` (tsc --noEmit)

---

## 3) Project Layout
```
backend/
  src/
    app.ts               # buildServer() and start()
    plugins/
      cors.ts            # CORS config
      helmet.ts          # Security headers
      logger.ts          # Pino config
      auth.ts            # Auth preHandler (mock|firebase)
    routes/
      health.ts
      telemetry.ts
      timelapse.ts
      notifications.ts
      greenhouse.ts
    lib/
      schemas.ts         # Zod schemas & types
      respond.ts         # { ok:true,data } / { ok:false,error }
      firebase.ts        # (optional) firebase-admin init, guarded by AUTH_MODE
    data/mock/
      telemetry.json
      timelapse.json
      notifications.json
      greenhouse.json
  .env.example
  tsconfig.json
  package.json
  README.md
```

**Rule:** each route lives in its own file, registers on `/api/...`, and references Zod schemas from `lib/schemas.ts`.

---

## 4) ENV Configuration
Create `.env` from `.env.example`:
```
PORT=3000
NODE_ENV=development
AUTH_MODE=mock           # mock | firebase
CORS_ORIGIN=http://localhost:5173
# (when AUTH_MODE=firebase)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```
> Private key must be loaded safely (escaped newlines handled). Do not commit `.env`.

## 5) Protected Routes

- Register `plugins/auth.ts` before any routes that need auth.
- Use `preHandler: app.auth` in route options to enforce authentication.
- Access the user via `req.user` (`uid` is always present once authenticated).
- Keep state scoped by `uid` (in-memory maps for now).

---

## 5) API Surface (MVP)
All responses share the same envelope:
```json
{ "ok": true, "data": { } }                    // success
{ "ok": false, "error": { "code": "", "message": "" } }  // error
```

Routes (mocked by JSON under `data/mock`):
- `GET /api/health` → `{ ok:true, data:{ status:"ok" } }`
- `GET /api/telemetry?from&to&limit` → list of samples (temperature, humidity, soilMoisture, light)
- `GET /api/timelapse` → list of frames (url, timestamp)
- `GET /api/greenhouses/current` → current greenhouse config
- `GET /api/notifications` / `PUT /api/notifications` → notification prefs

> Keep handlers small: parse query/path with Zod; map to mock data; return envelope.

---

## 6) Auth Modes
- **mock (default):** no token verification; optional `x-user-id` header to simulate a user. `req.user = { uid: 'demo' }`.
- **firebase:** verify `Authorization: Bearer <ID_TOKEN>` using `firebase-admin`. On failure → 401 with envelope.

Implementation sketch (preHandler):
```ts
// plugins/auth.ts
export function authPreHandler(mode: 'mock'|'firebase'): FastifyPluginAsync { /* set req.user */ }
```
Routes that require auth must add `preHandler: server.auth` (registered alias).

---

## 7) Zod Schemas (typesafe contracts)
Put schemas in `lib/schemas.ts` and export both schema and inferred TypeScript type:
```ts
export const TelemetrySample = z.object({
  timestamp: z.string().datetime(),
  temperature: z.number(),
  humidity: z.number(),
  soilMoisture: z.number(),
  lightHours: z.number().optional()
});
export type TelemetrySample = z.infer<typeof TelemetrySample>;

export const TelemetryList = z.object({
  items: z.array(TelemetrySample),
  total: z.number().int().nonnegative()
});
```
In routes, use `schema.response` for Fastify + Zod runtime checks.

---

## 8) Route Recipe (copy this)
```ts
// routes/telemetry.ts
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { TelemetryList } from '../lib/schemas';
import { ok } from '../lib/respond';

const Query = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25)
});

const telemetryRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/telemetry', {
    preHandler: app.auth,
    schema: { querystring: Query.strict(), response: { 200: TelemetryList } }
  }, async (req) => {
    const q = Query.parse(req.query);
    const data = []; // read from data/mock/telemetry.json
    return ok({ items: data.slice(0, q.limit), total: data.length });
  });
};
export default telemetryRoutes;
```

**Envelope helpers (`lib/respond.ts`):**
```ts
export const ok = <T>(data: T) => ({ ok: true as const, data });
export const fail = (code: string, message: string, status = 400) => ({
  statusCode: status, body: { ok: false as const, error: { code, message } }
});
```

---

## 9) Server Recipe
```ts
// src/app.ts
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';

export function buildServer() {
  const app = Fastify({ logger: true });
  app.register(cors, { origin: process.env.CORS_ORIGIN ?? true });
  app.register(helmet);
  app.decorate('auth', async (req, rep) => {}); // replaced by plugin/auth
  app.register(import('./plugins/auth').then(m => m.default));
  app.register(import('./routes/health').then(m => m.default));
  app.register(import('./routes/telemetry').then(m => m.default));
  app.register(import('./routes/timelapse').then(m => m.default));
  app.register(import('./routes/notifications').then(m => m.default));
  app.register(import('./routes/greenhouse').then(m => m.default));
  return app;
}

if (process.env.NODE_ENV !== 'test') {
  const app = buildServer();
  const port = Number(process.env.PORT ?? 3000);
  app.listen({ port, host: '0.0.0.0' });
}
```

---

## 10) Constraints & Conventions
- One route per file; import Zod schemas from `lib/schemas.ts`.
- No `any` in public types; prefer Zod inference.
- Use the response **envelope** for all routes.
- Proper HTTP status + `{ ok:false, error:{ code, message } }` on errors.
- Log errors via `req.log.error(err)` (no secrets).

---

## 11) Acceptance Checklist (for any PR)
- `npm run dev` boots; `GET /api/health` returns OK.
- All inputs validated with Zod; responses declare `schema.response`.
- CORS/Helmet registered; Pino logs enabled.
- Typecheck passes; no unrelated reformatting.

---

## 12) Out of Scope (MVP)
- Real database; persistence (mock JSON only).
- IoT ingress (HTTP/MQTT), sockets, notifications delivery.
- Complex auth/roles beyond `mock|firebase` switch.

---

## 13) Tasks Agents Can Do
- Scaffold route files under `src/routes/*` following the **Route Recipe**.
- Add Zod schemas in `lib/schemas.ts`; wire them in `schema.response`.
- Implement `AUTH_MODE=mock` preHandler and wire `app.auth`.
- Create mock JSON in `data/mock/*`; filter/slice by query.
- Add README snippets with sample cURL.
