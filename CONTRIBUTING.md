# Contributing

Thanks for working on Tiny Greenhouse. This project was built as a thesis prototype and donated for educational use — contributions that keep it easy to run and understand are very welcome.

## Getting set up

See the [README](README.md) for prerequisites and the local dev quick start. The backend runs in mock mode with no credentials; the frontend needs a free Firebase project.

After cloning, install the secret-scanning pre-commit hook (hooks are local and don't travel with the repo):

```bash
ln -sf ../../scripts/check-secrets.sh .git/hooks/pre-commit
```

## Conventions

- **TypeScript strict everywhere**; no `any` in public types.
- **API envelope:** every backend response is `{ ok: true, data }` or `{ ok: false, error: { code, message } }`.
- **Zod is the source of truth** for validation, shared via `backend/src/lib/schemas.ts`.
- **Never commit secrets.** `.env`, `.env.local`, and `secrets.h` are git-ignored; only the `*.example` templates belong in git. Keep the templates in sync when you add a variable.
- Each area (`backend/`, `frontend/`, `hardware/`, `docs/`) has a `CLAUDE.md` with the local coding patterns — read the relevant one before making changes there.

## Workflow

- Non-trivial work starts with a task ticket in [`docs/tasks/`](docs/tasks/) named `TG-NNN.md` (Goal / Background / Acceptance criteria / Implementation notes). These tickets double as the project's design history.
- Before committing backend changes: `cd backend && npm run typecheck` must pass clean.
- Before committing frontend changes: `cd frontend && npm run lint` and `npm run build` should pass.

## License

By contributing you agree that your contributions are licensed under the [MIT License](LICENSE).
