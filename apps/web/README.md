# apps/web — Deximon Frontend

Next.js (App Router) + TypeScript + Tailwind.

```bash
npm install
npm run dev          # http://localhost:3000
npm run lint
npm run typecheck
npm test
```

## Auth integration notes

The auth UI uses the FastAPI cookie session through `fetchAPI`, which always
sends `credentials: "include"`. Login and signup call `/auth/login` and
`/auth/register`, then refresh the current user through `/auth/me`.

Known backend shape gaps:

- Binder visibility currently supports `public` and `private`; the older UI
  copy mentioned `unlisted`, but that value is not exposed by the API yet.
- Public profiles are loaded from `/profiles/{username}`, but seller ratings,
  joined dates, listings, and binder card payloads are still demo data until
  those backend services are connected.
- The scanner page attempts `POST /scan/mock` through `fetchAPI`. Until a
  scanner proxy or scanner-service CORS endpoint exists, it falls back to
  explicit local mock candidates. "Save to binder" stores the confirmed card in
  local session state only; the binder/card create endpoint is still a TODO.
