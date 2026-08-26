# Deximon Showcase

This directory contains the independent, static portfolio presentation for **Deximon**. It is intentionally isolated from the completed application in `../apps`, `../infra`, `../data`, and the root Docker configuration.

The public showcase can be deployed to Vercel without the original EC2 host, PostgreSQL database, Redis instance, scanner service, S3 bucket, Rekognition calls, OAuth credentials, SMTP service, or any other application runtime.

## 1. What Deximon is

Deximon is a full-stack trading card collection and marketplace platform. The original application connects a photo-assisted card scanner, a multi-page digital binder, marketplace listings, listing-scoped conversations, collector profiles, notifications, and seller reviews.

The portfolio site has two surfaces:

- `/` presents the product, original architecture, engineering highlights, verified security controls, and technology stack.
- `/demo/` recreates the major product workflows with bundled sample data and browser-local state.

## 2. Original system architecture

The preserved application used three separately containerized application services:

```text
Browser
  |
  | HTTPS
  v
Nginx + Certbot on an AWS EC2 host
  |------------------------------|
  v                              v
Next.js web                  FastAPI main API
                                 |
             |-------------------|--------------------|
             v                   v                    v
        PostgreSQL        Redis registration     FastAPI scanner
        + Alembic           rate limiter               |
                                              Pillow preprocessing
                                                     + |
                                      local catalog / RapidFuzz
                                                     + |
                                          S3 + Rekognition OCR
```

The main FastAPI API owns authentication, profiles, binders, card inventory, marketplace listings, conversations, notifications, reviews, and the authenticated scanner proxy. The separate scanner service owns the resource-heavy image and OCR pipeline. Docker Compose defines local and production service topology; Nginx routes the single public domain to Next.js and FastAPI and upgrades WebSocket connections.

Redis is used for the registration fixed-window limiter. It is not used as an application cache or WebSocket pub/sub layer. Password-reset email is implemented through SMTP with STARTTLS; Amazon SES is not implemented. EC2 is documented as the production host, but the repository does not contain AWS provisioning/IAM infrastructure as code.

## 3. Major features

- Email/password authentication and Google OAuth/OpenID Connect
- JWT authentication through an httpOnly browser cookie or Bearer token
- Public/private collector profiles and binder visibility
- Multi-page 3×3 binder organization and card detail management
- Searchable card catalog and owned-card inventory
- Marketplace search, filters, listing details, and listing status transitions
- Conversations tied to marketplace listings, with unread state and WebSockets
- Notifications for messages, listing events, and review prompts
- Reviews gated by completed buyer/seller relationships
- Image validation, EXIF correction, RGB normalization, resizing, and JPEG re-encoding
- Optional S3 upload and Rekognition OCR followed by local-catalog fuzzy matching
- Local mock scanner path and durable account/AWS-scan cost caps

The showcase demonstrates these areas without reproducing or invoking the live service behavior. Simulated actions are visibly labeled and stored only in `localStorage` under `deximon-showcase-state-v1`.

## 4. Technologies

### Original application

- Next.js 15 App Router, React 19, TypeScript, Tailwind CSS
- Python 3.12, FastAPI, Pydantic
- SQLAlchemy 2, Alembic, PostgreSQL 16
- Redis 7
- Pillow, OpenCV, RapidFuzz
- boto3, AWS S3, AWS Rekognition
- Google OAuth/OpenID Connect, Authlib, JWT, Passlib/bcrypt
- Docker, Docker Compose, Nginx, Certbot, AWS EC2
- REST/OpenAPI, authenticated WebSockets
- Pytest, Ruff, mypy, Vitest, GitHub Actions

### Portfolio showcase

- Next.js 15, React 19, TypeScript, plain CSS
- Static export (`output: "export"`)
- No API routes, middleware, server actions, runtime environment dependencies, `fetch`, or WebSockets
- Text-based Open Graph metadata plus direct static card artwork from `images.pokemontcg.io`

## 5. Security considerations

Verified controls in the original source include:

- bcrypt password hashing through Passlib
- Signed, expiring JWTs
- httpOnly, SameSite=Lax authentication cookies with a configurable Secure flag
- Google OAuth state validation and `email_verified` checks
- Random password-reset tokens stored as HMAC-SHA-256 digests, with expiry, one-time use, and revocation of older active reset tokens
- Protected FastAPI dependencies plus owner/participant checks across binder, marketplace, chat, notifications, and reviews
- Exact-origin credentialed CORS configuration
- Nginx TLS, request-rate, connection, and upload-size limits
- Redis-backed registration throttling and PostgreSQL row-locked account/scan caps
- Environment-backed secrets/configuration; the real root `.env` is ignored and was not found in Git history

### Repository audit findings to address before publicizing the source

The audit did not find a high-confidence committed AWS key, OAuth secret, private key, compact JWT, or similar cloud/API credential. It did find these material issues:

1. **Tracked PostgreSQL cluster:** `../data/postgres/**` contains 1,271 tracked database files and includes a PostgreSQL SCRAM role-password verifier. Docker Compose does not use this directory. Review it, add `data/postgres/` to the root ignore rules, remove it from tracking and Git history, and rotate the database role password anywhere it may have been reused. This showcase does not alter it because the completed repository is under a strict read-only preservation constraint.
2. **OAuth account-linking risk:** password registration does not verify email, while Google OAuth can attach a verified Google identity to an existing matching-email account. Redesign linking to require proof from the existing account or verified-email registration.
3. **Production hardening:** explicitly enable Secure cookies in production; consider token revocation/rotation, application-level login/reset throttling, CSRF protection, WebSocket token transport that avoids query strings, stricter upload decoding/limits, narrower per-service environment files, container hardening, and S3 deletion/lifecycle/bucket/IAM policies.

Do not describe the original system as using SES, IAM-as-code, private/encrypted S3 policy, Redis caching/pub-sub, verified-email registration, JWT revocation, or unconditional Secure cookies; those controls are not established by the repository.

The showcase itself performs no authentication, accepts no remote data, and sends no user input to a server. Vercel response headers disable framing, MIME sniffing, camera/microphone/geolocation access, and unsafe referrer leakage. The demo&apos;s optional image picker uses `FileReader`; the selected file remains in the browser.

## 6. Local development

Requirements: Node.js 20 or later and npm.

```powershell
cd showcase
npm ci
npm run dev
```

Open `http://localhost:3000`. No `.env` file and no original Deximon service are required.

Validation:

```powershell
npm test
npm run lint
npm run typecheck
npm run build
```

The production build is written to `showcase/out/` as static HTML, CSS, JavaScript, and assets.

## 7. Showcase deployment on Vercel

Dashboard workflow:

1. Push the repository to GitHub.
2. In Vercel, choose **Add New → Project** and import `neelmu12-code/Deximon` (or the repository fork you want to publish).
3. Set **Root Directory** to `showcase`.
4. Keep **Framework Preset** as `Next.js`.
5. Use **Install Command** `npm ci` and **Build Command** `npm run build`. Leave the output setting on the framework default; the Next configuration exports static output to `out/`.
6. Do not copy any original backend, database, AWS, OAuth, JWT, Redis, or SMTP environment variables into this Vercel project. None are required.
7. Deploy.
8. Verify `/`, `/demo/`, and `/demo/#scanner`, then refresh both concrete routes. `trailingSlash: true` emits directory-index routes, so no SPA catch-all rewrite is needed.

Vercel&apos;s production URL is used automatically for social metadata when its system environment variables are available. If you want to force a custom canonical host at build time, optionally set:

```text
NEXT_PUBLIC_SITE_URL=https://your-domain.example
```

This is metadata-only and is not required for the site to load.

The configured repository link in the site is:

`https://github.com/neelmu12-code/Deximon`

## 8. Demo-mode preservation note

The Vercel deployment is a portfolio simulation, not a replacement for the original application. It never imports from or calls the preserved Next.js frontend, FastAPI services, PostgreSQL data, Redis limiter, scanner, AWS resources, Google OAuth integration, SMTP service, or Nginx deployment.

All original source remains in its existing location for code review. Because those files were explicitly declared read-only, the root `README.md` was not changed; this showcase-local README carries the portfolio, security, development, and Vercel handoff documentation instead.
