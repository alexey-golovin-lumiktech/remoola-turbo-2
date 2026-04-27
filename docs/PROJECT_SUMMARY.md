# Remoola - Project Summary

Remoola is a payments and FX platform delivered as a Turborepo monorepo. The maintained repository state is centered on `apps/api-v2`, `apps/consumer-css-grid`, `apps/admin-v2`, and a shared package layer for API contracts, database access, security utilities, testing, and UI.

---

## Repo at a glance

| Layer | Path | Role |
|------|------|------|
| Backend | `apps/api-v2` | NestJS REST API authority for `consumer-css-grid` and current auth-sensitive cutovers |
| Admin UI | `apps/admin-v2` | Next.js dashboard for operators on port `3011` |
| Consumer CSS Grid | `apps/consumer-css-grid` | Next.js css-grid consumer shell on port `3003` |
| Database | `packages/database-2` | Prisma schema, migrations, generated client |
| Shared packages | `packages/api-types`, `packages/security-utils`, `packages/test-db`, `packages/ui`, `packages/shared-constants`, `packages/api-e2e` | Contracts, auth helpers, testing, UI, tooling |

---

## Current architecture split

- `apps/api-v2` is the backend authority for `apps/consumer-css-grid` and the maintained auth/cutover surface documented in the release docs.
- Consumer browser auth is cookie-first and same-origin BFF-driven. Per-app canonical frontend origins are now part of the runtime contract:
  - `CONSUMER_CSS_GRID_APP_ORIGIN`
  - `ADMIN_V2_APP_ORIGIN`
- `NEXT_PUBLIC_APP_ORIGIN` remains only as a legacy frontend fallback and is not the primary production contract.

---

## What each app does

- **`apps/api-v2`** - active backend surface for current auth-sensitive cutovers and the canonical backend for `consumer-css-grid`, including auth/cookie/app-scope runtime enforcement.
- **`apps/admin-v2`** - operator dashboard with auth, verification workflows, consumer/admin management, payment request tooling, ledger views, exchange views, audit access, and the maintained admin frontend contract.
- **`apps/consumer-css-grid`** - css-grid consumer shell backed by `apps/api-v2`, with the same app-scope-driven auth/cookie model and stricter production-origin contract.

---

## Tech stack

- Runtime: Node.js `>= 18`
- Package manager: Yarn `1.22.22`
- Backend: NestJS, Prisma, PostgreSQL
- Frontend: Next.js `15`, React `19`
- Payments: Stripe
- Monorepo: Turborepo

---

## Quick start

1. Install dependencies:

```bash
yarn
```

2. Copy the env files for the packages and apps you plan to run:

```bash
cp packages/database-2/.env.example packages/database-2/.env

cp apps/admin-v2/.env.example apps/admin-v2/.env
cp apps/api-v2/.env.example apps/api-v2/.env
cp apps/consumer-css-grid/.env.example apps/consumer-css-grid/.env
```

3. Generate Prisma artifacts:

```bash
yarn db:generate
```

4. Run the monorepo or individual surfaces:

```bash
yarn dev

yarn dev:api-v2
yarn dev:admin-v2
yarn dev:consumer-css-grid
```

Local defaults from the current app scripts and env examples:

- API v2: `http://localhost:3334/api`
- Admin v2: `http://localhost:3011`
- Consumer CSS Grid: `http://localhost:3003`

Use the same hostname family (`localhost` or `127.0.0.1`) across backend, frontend, and OAuth config. Mixed-host local auth flows are intentionally unsupported because cookies are scoped per host.

---

## Daily workflow

- Root `yarn dev` runs workspace dev tasks in parallel and depends on `db:generate`.
- Root `yarn build` runs `yarn workspace @remoola/database-2 run db:generate` first, then `turbo run build`.
- Current DB commands are:
  - `yarn db:generate`
  - `yarn db:validate`
  - `yarn db:migrate`
  - `yarn db:deploy`
  - `yarn db:studio`
- `yarn test`, `yarn test:e2e`, and `yarn test:e2e:fast` are local-development-only entrypoints and are blocked in CI/Vercel by `scripts/ensure-local-development.js`.
- Local test/e2e flows rely on `@remoola/test-db` and Testcontainers, so Docker availability is part of the expected developer environment.
- `.husky/pre-commit` skips lint/tests for docs-only changes; for code changes it runs `yarn lint`, builds `@remoola/test-db`, then runs maintained unit tests and `apps/api-v2` fast e2e.
- `yarn verify:v2-apps` is the root verification gate for the maintained `api-v2` + `consumer-css-grid` + `admin-v2` surface.

---

## Documentation

### Start here

| File | Purpose |
|------|---------|
| `README.md` | Setup, commands, repo layout, documentation map |
| `docs/PROJECT_SUMMARY.md` | Current-state summary and navigation map |

### Current-state references

| File | Purpose |
|------|---------|
| `docs/PROJECT_DOCUMENTATION.md` | Consolidated API, app, package, and database overview |
| `docs/FEATURES_CURRENT.md` | Implemented features and current repository state |

### Operational and release docs

| File | Purpose |
|------|---------|
| `docs/CONSUMER_AUTH_COOKIE_POLICY.md` | Canonical browser/BFF cookie contract |
| `docs/API_V2_PRODUCTION_RELEASE_GATE.md` | Required evidence for auth-sensitive `api-v2` releases |
| `docs/SWAGGER_COOKIE_AUTH_USAGE.md` | Swagger cookie-auth workflow on API-origin docs pages |
| `docs/CONSUMER_AUTH_CUTOVER_RELEASE_HANDOFF.md` | Release-specific handoff and closure notes for the consumer auth cutover |
| `docs/CONSUMER_BROWSER_IDENTITY_TRACKING.md` | Browser identity (`deviceId`) and consumer action-log contracts |
| `docs/FINANCIAL_SAFETY_AND_DB_COMPLIANCE.md` | Fintech safety, ledger invariants, idempotency, and DB rollout constraints |

### Governance docs

| File | Purpose |
|------|---------|
| `docs/project-design-rules.md` | Project design rules and repo boundaries |
| `docs/postgresql-design-rules.md` | PostgreSQL schema and migration rules |
