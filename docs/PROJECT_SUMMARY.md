# Remoola — Project Summary

**Remoola** is a payments and FX platform delivered as a Turborepo monorepo: one NestJS backend and two Next.js frontends (admin and consumer), with shared types, database, and UI packages.

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

- **API** — Auth (admin + consumer), dashboard stats, consumers & admins management, payment requests (list, archive, refund, chargeback), ledger (append-only financial history; status via outcome/dispute tables), exchange rates and rules, scheduled FX, Stripe integration (webhook event dedup), documents, contacts, contracts, profile and settings. Consumer list endpoints (contacts, contracts, documents, payments, exchange rules, scheduled) support pagination (`page`, `pageSize`). Google OAuth supports optional `returnOrigin` query parameter for multi-app deployments.
- **Admin** — Login, dashboard (stats, verification queue, recent requests, ledger anomalies), admins CRUD, consumers list/details and verification, payment requests (list, details, expectation-date archive), ledger and anomalies, exchange (rules, scheduled, rates). Exchange uses api-types currency codes.
- **Consumer** — Login, signup (multi-step), OAuth, dashboard, contacts, contracts, documents (all list tables paginated), payment methods (incl. Stripe), payment requests and payments (list, start, withdraw, transfer), exchange and rules, profile, theme and preferred-currency settings. Currency options and shared UI (PaginationBar, AmountCurrencyInput) use api-types.
- **Consumer Mobile** — Mobile-first Next.js app running on port 3002. Shares backend API with desktop consumer app. Supports Google OAuth with `returnOrigin` parameter for proper redirect after authentication.

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

Note: `yarn test` and `yarn test:e2e` are intended for local development only; they are blocked in CI and on Vercel by `scripts/ensure-local-development.js`.

---

## Documentation

| File | Purpose |
|------|---------|
| `README.md` | Setup, commands, repo layout |
| `docs/PROJECT_SUMMARY.md` | High-level overview (this file; start here) |
| `docs/PROJECT_DOCUMENTATION.md` | Full API, screens, DB schema, packages |
| `docs/FEATURES_CURRENT.md` | Implemented features and current state |
| `docs/FINANCIAL_SAFETY_AND_DB_COMPLIANCE.md` | Fintech safety, ledger invariants, idempotency |
| `docs/project-design-rules.md` | Project design rules (boundaries, naming, migrations) |
| `docs/postgresql-design-rules.md` | PostgreSQL design rules |
