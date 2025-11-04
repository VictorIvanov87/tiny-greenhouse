# Tiny Greenhouse Backend

Minimal Fastify backend scaffold for Tiny Greenhouse.

## Commands

- `npm install`
- `npm run dev` — start Fastify with hot reload
- `npm run typecheck` — run TypeScript in no-emit mode
- `npm run build` — bundle with tsup
- `npm start` — run compiled output from `dist/`

## Environment

Copy `.env.example` to `.env` and adjust values as needed.

## Health Check

Once running, `GET /api/health` responds:

```json
{ "ok": true, "data": { "status": "ok" } }
```
