# Remoola — Project Summary

**Remoola** is a payments and FX platform delivered as a Turborepo monorepo: one NestJS backend and three Next.js frontends (admin, consumer, and consumer-mobile), with shared types, database, and UI packages.

---

## Repo at a glance

| Layer        | Path           | Role                                      |
|-------------|----------------|-------------------------------------------|
| **Backend** | `apps/api`     | NestJS REST API (admin + consumer namespaces) |
| **Admin UI**| `apps/admin`   | Next.js dashboard for operators            |
| **Consumer UI** | `apps/consumer` | Next.js consumer portal (desktop)       |
| **Consumer Mobile** | `apps/consumer-mobile` | Next.js mobile-first consumer app (port 3002) |
| **Database**| `packages/database-2` | Prisma schema, migrations, client  |
| **Shared**  | `packages/api-types`, `env`, `ui`, etc. | Types, env, UI, tooling |

---

## What each app does

- **API** — Auth (admin + consumer) with shared cookie policy (`@remoola/api-types`; __Host- in production) and consumer auth sessions (DB-backed `auth_sessions`, refresh rotation, revocation). Consumer forgot-password and reset (origin-validated; reset token stored as hash only). Dashboard stats, consumers & admins management, payment requests (list, archive, refund, chargeback), ledger (append-only financial history; status via outcome/dispute tables), exchange rates and rules, scheduled FX, Stripe integration (webhook event dedup), Stripe Identity Verify Me lifecycle (canonical verification-session start route, persisted consumer verification state, stale-session-safe managed webhook updates), documents, contacts, contracts, profile and settings. Consumer list endpoints (contacts, contracts, documents, payments, exchange rules, scheduled) support pagination (`page`, `pageSize`). Google OAuth now uses explicit `appScope` as the only public redirect identity for multi-app consumer deployments; `OriginResolverService` validates trusted request scope, OAuth state stores `appScope`, and callback/handoff redirects resolve target origins through `appScope -> configured origin`. OAuth crypto utilities and token hashing in `@remoola/security-utils` (PKCE, state signing, nonce, hashTokenToHex).
- **Admin** — Login, dashboard (stats, verification queue, recent requests, ledger anomalies), admins CRUD, consumers list/details and verification, payment requests (list, details, expectation-date archive), ledger and anomalies, exchange (rules, scheduled, rates). Exchange uses api-types currency codes.
- **Consumer** — Login, signup (multi-step), OAuth, dashboard, contacts, contracts, documents (all list tables paginated), payment methods (incl. Stripe), payment requests and payments (list, start, withdraw, transfer), Verify Me identity verification with continue / retry states, exchange and rules, profile, theme and preferred-currency settings. The shell now includes a command palette (`Cmd+K` on Apple platforms, `Ctrl+/` on Linux/Windows), a compact mobile nav with `More` for secondary destinations, earlier theme application before paint, and tighter signup/profile validation. Currency options and shared UI (PaginationBar, AmountCurrencyInput) use api-types.
- **Consumer Mobile** — Mobile-first Next.js app running on port 3002. Shares backend API with desktop consumer app. Enhanced UI library with 54 icon components, IconBadge, PageHeader, SearchInput. CSS Modules-first styling across routes/features/shared UI. Comprehensive test coverage for auth flows. Uses the shared consumer OAuth model where same-origin BFF routes forward `appScope=consumer-mobile`, and the backend routes callback/handoff flows by stored `appScope` rather than raw origin. Login redirect parameters and middleware refresh behavior are hardened for safer auth navigation. Includes Verify Me state across mobile dashboard and settings flows.

---

## Tech stack

- **Runtime:** Node.js ≥ 18
- **Package manager:** Yarn 1.22
- **Backend:** NestJS, Prisma, PostgreSQL
- **Frontends:** Next.js (App Router)
- **Payments:** Stripe (checkout, setup intents, webhooks)
- **Monorepo:** Turborepo

---

## Quick start

```bash
yarn
cp .env.example .env
cp apps/api/.env.example apps/api/.env
yarn db:generate
yarn dev
```

Note: `yarn test` and `yarn test:e2e` are intended for local development only; they are blocked in CI and on Vercel by `scripts/ensure-local-development.js`. For quicker API e2e iterations locally, use `yarn workspace @remoola/api test:e2e:fast` (optional `TEST_DB_VERBOSE=1`; see `packages/test-db` and CHANGELOG 2026-03-20).

---

## Documentation

| File | Purpose |
|------|---------|
| `README.md` | Setup, commands, repo layout |
| `docs/PROJECT_SUMMARY.md` | High-level overview (this file; start here) |
| `docs/PROJECT_DOCUMENTATION.md` | Full API, screens, DB schema, packages |
| `docs/FEATURES_CURRENT.md` | Implemented features and current state |
| `docs/CONSUMER_BROWSER_IDENTITY_TRACKING.md` | Browser identity (`deviceId`) + consumer action-log design, contracts, rollout |
| `docs/FINANCIAL_SAFETY_AND_DB_COMPLIANCE.md` | Fintech safety, ledger invariants, idempotency |
| `docs/project-design-rules.md` | Project design rules (boundaries, naming, migrations) |
| `docs/postgresql-design-rules.md` | PostgreSQL design rules |
