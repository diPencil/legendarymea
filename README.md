# Legendary Management MEA

Repository structure:

- `frontend/` — the current Next.js website, including the public pages, localized EN/AR content, request experience, and the existing request API/webhook integration.
- `backend/` — reserved for the future backend, database, administration, and request-management services.

## Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

Production checks:

```bash
cd frontend
pnpm exec tsc --noEmit
pnpm build
```

Backend development has not started yet. Until it does, the existing frontend request endpoint continues to use the production-ready webhook configuration documented in `frontend/.env.example`.
