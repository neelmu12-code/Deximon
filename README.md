# Deximon

A social, web-based platform for Pokemon TCG collectors. Digital binder, card-recognition scanner, and a listing-scoped trade/sale marketplace.

EECS4314 Advanced Software Engineering (Winter 2026).

Team: Ege Yesilyurt, Brian Chang-Kit, Abhiroop Sikand, Neel Upadhyay, Weiqin Situ.

## Monorepo layout

```
apps/
  web/             Next.js (App Router) - frontend
  api/             FastAPI main backend - auth, profiles, binder, marketplace, chat
  scanner/         FastAPI card-recognition microservice - OCR + TCG match
packages/
  shared-types/    TypeScript types shared between web and any TS tooling
docs/
  api/             OpenAPI specs per service (one file each)
```

## Quickstart

```bash
# 1. Copy env and set JWT_SECRET_KEY to a strong local secret
cp .env.example .env

# 2. Bring up the local stack
docker compose up --build

# 3. Open services
# - Web        http://localhost:3000
# - API docs   http://localhost:8000/docs
# - Scanner    http://localhost:8001/healthz
```

After the API container is up, run migrations once:

```bash
docker compose exec api alembic upgrade head
docker compose exec api python -m app.scripts.seed
```
