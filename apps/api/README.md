# apps/api - Deximon Main Backend

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

## Authentication contract

Browser clients should send requests with credentials enabled. Successful registration, email
login, and Google OAuth login set an httpOnly `access_token` cookie with `SameSite=Lax`.
API clients may instead send the returned JWT as `Authorization: Bearer <token>`.

```bash
curl -i -c cookies.txt -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"misty@example.com","username":"misty","display_name":"Misty","password":"Starmie123!"}'

curl -i -c cookies.txt -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"misty@example.com","password":"Starmie123!"}'

curl -b cookies.txt http://localhost:8000/auth/me
curl -H "Authorization: Bearer <access_token>" http://localhost:8000/auth/me
```

Profile updates use `PATCH /profiles/me` with `display_name`, `bio`, or `avatar_url`.
Privacy updates use `PATCH /profiles/me/privacy` with `{"binder_visibility":"public"}` or
`{"binder_visibility":"private"}`. Public profile lookup is `GET /profiles/{username}`.

Password reset starts with `POST /api/auth/forgot-password`. The response is always generic
and does not reveal whether the email exists. When email delivery is not configured, the API
logs a local development reset URL like `FRONTEND_URL/reset-password?token=...`.

```bash
curl -X POST http://localhost:8000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"misty@example.com"}'

curl -X POST http://localhost:8000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"<token-from-reset-link>","new_password":"NewStarmie123!"}'
```

Google login starts at `GET /api/auth/google/login` and redirects back through
`GET /api/auth/google/callback`. The older `/auth/google/*` paths remain available for
compatibility. Configure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
`GOOGLE_REDIRECT_URI`, and `FRONTEND_URL`; optional exact overrides are
`FRONTEND_AUTH_SUCCESS_URL` and `FRONTEND_AUTH_ERROR_URL`. Authlib validates OAuth state
using its signed session cookie.

Local Google OAuth values:

```bash
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback
FRONTEND_URL=http://localhost:5173
```

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
