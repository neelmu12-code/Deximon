# apps/api — Deximon Main Backend

FastAPI service. Owns auth, profiles, binder, listings, marketplace search, chat.

## Local dev

```bash
poetry install
cp ../../.env.example .env
# Postgres must be running (use repo-root docker compose, or your own).
poetry run alembic upgrade head
poetry run python -m app.scripts.seed
poetry run uvicorn app.main:app --reload --port 8000
```

API docs at http://localhost:8000/docs.

## Tests

```bash
poetry run pytest
poetry run ruff check .
poetry run mypy app
```

## Migrations

```bash
poetry run alembic revision --autogenerate -m "add foo"
poetry run alembic upgrade head
```
