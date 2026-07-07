# Deximon

A social, web-based platform for Pokémon TCG collectors. Digital binder, card-recognition scanner, and a listing-scoped trade/sale marketplace.

EECS4314 Advanced Software Engineering (Summer 2026).

Team: Ege Yesilyurt, Brian Chang-Kit, Abhiroop Sikand, Neel Upadhyay, Weiqin Situ, Arjon Sadikaj.

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

# 2. Bring up the local stack and run migrations
./scripts/dev-up.ps1 -Build

# 3. Open services
# - Web        http://localhost:3000
# - API docs   http://localhost:8000/docs
# - Scanner    http://localhost:8001/healthz
```

If you prefer raw Docker commands, run migrations once after the API container is up:

```bash
docker compose exec api alembic upgrade head
docker compose exec api python -m app.scripts.seed
```

Useful local scripts:

```powershell
./scripts/dev-up.ps1          # start stack and run migrations
./scripts/dev-up.ps1 -Build   # rebuild images, start stack, run migrations
./scripts/dev-migrate.ps1     # start API dependencies and run Alembic
./scripts/dev-reset.ps1 -Force # delete Docker volumes, rebuild, migrate, seed
```

## Status

This project is under active development for EECS4314 (Summer 2026).
