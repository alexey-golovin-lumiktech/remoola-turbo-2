# Remoola — Project Summary

**Remoola** is a payments and FX platform delivered as a Turborepo monorepo: one NestJS backend and two Next.js frontends (admin and consumer), with shared types, database, and UI packages.

---

## Repo at a glance

| Layer        | Path           | Role                                      |
|-------------|----------------|-------------------------------------------|
| **Backend** | `apps/api`     | NestJS REST API (admin + consumer namespaces) |
| **Admin UI**| `apps/admin`   | Next.js dashboard for operators            |
| **Consumer UI** | `apps/consumer` | Next.js portal for end users           |
| **Database**| `packages/database-2` | Prisma schema, migrations, client  |
| **Shared**  | `packages/api-types`, `env`, `ui`, etc. | Types, env, UI, tooling |

---

## What each app does

- **API** — Auth (admin + consumer), dashboard stats, consumers & admins management, payment requests (list, archive, refund, chargeback), ledger, exchange rates and rules, scheduled FX, Stripe integration, documents, contacts, contracts, profile and settings.
- **Admin** — Login, dashboard (stats, verification queue, recent requests, ledger anomalies), admins CRUD, consumers list/details and verification, payment requests (list, details, expectation-date archive), ledger and anomalies, exchange (rules, scheduled, rates).
- **Consumer** — Login, signup (multi-step), OAuth, dashboard, contacts, contracts, documents, payment methods (incl. Stripe), payment requests and payments (list, start, withdraw, transfer), exchange and rules, profile and theme settings.

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

---

## Documentation

| File | Purpose |
|------|---------|
| `README.md` | Setup, commands, repo layout |
| `AGENTS.md` | Engineering rules and constraints |
| `PROJECT_DOCUMENTATION.md` | Full API, screens, DB schema, packages |
| `FEATURES_CURRENT.md` | Implemented features and current state |
