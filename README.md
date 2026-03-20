# Remoola

Remoola is a Turborepo monorepo for the Remoola platform: a NestJS API plus three Next.js frontends (admin, consumer, and consumer-mobile). The repo also contains shared types, UI primitives, and Prisma database tooling.

## Repo layout

```text
.
├── apps
│   ├── api              # NestJS backend (REST APIs)
│   ├── admin            # Next.js admin dashboard
│   ├── consumer         # Next.js consumer portal
│   └── consumer-mobile  # Next.js mobile-first consumer app
└── packages
    ├── api-types         # Shared API contracts/types
    ├── database-2        # Prisma schema, migrations, client
    ├── db-fixtures       # DB fixture helpers for tests
    ├── env               # Shared env schema (Zod)
    ├── eslint-config     # ESLint + Prettier configs
    ├── jest-config       # Jest configs
    ├── security-utils    # Crypto, token, hashing helpers
    ├── shared-constants  # Shared constants
    ├── test-db           # Test DB utilities
    ├── typescript-config # Shared tsconfig presets
    └── ui                # Shared UI components
```

## Prerequisites

- Node.js >= 18
- Yarn 1.22
- Postgres database for local development

## Getting started

```bash
# install dependencies
yarn

# copy env templates you need
cp .env.example .env
cp apps/api/.env.example apps/api/.env

# generate Prisma client (from packages/database-2)
yarn db:generate

# start all apps/packages in dev mode
yarn dev
```

## Common commands

```bash
# development
yarn dev
yarn dev:api
yarn dev:admin
yarn dev:consumer
yarn dev:consumer-mobile

# build & start
yarn build
yarn start

# lint & format
yarn lint
yarn format

# tests (run only in local dev; blocked in CI/Vercel by scripts/ensure-local-development.js)
yarn test
yarn test:e2e
# faster API e2e (apps/api): reuses temp DB when TEST_DB_FAST_REUSE=1; see CHANGELOG 2026-03-20
yarn workspace @remoola/api test:e2e:fast

# database (Prisma)
yarn db:generate
yarn db:migrate:dev
yarn db:migrate:deploy
yarn db:push
yarn db:seed
```

## Documentation

Project root `docs/` are synced(single source of truth for features, API, safety, and design rules).

- `README.md` — this file (setup, commands, repo layout).
- `docs/PROJECT_SUMMARY.md` — high-level project overview (start here).
- `docs/PROJECT_DOCUMENTATION.md` — overview of API (base path `/api`), admin, consumer, and database.
- `docs/FEATURES_CURRENT.md` — implemented features and current repo state.
- `docs/CONSUMER_BROWSER_IDENTITY_TRACKING.md` — browser identity (`deviceId`) and consumer action-log architecture, compatibility contracts, rollout/runbook.
- `docs/FINANCIAL_SAFETY_AND_DB_COMPLIANCE.md` — fintech safety, ledger invariants, idempotency.
- `docs/MIGRATION_SAFETY_AUDIT.md` — migration safety notes and governance-oriented migration assessment.
- `docs/SECURITY_AUDIT_AUTH_WEBHOOKS_PII.md` — auth/webhook/PII-focused security audit notes.
- `docs/project-design-rules.md` — project design rules (dead code, boundaries, naming, migrations).
- `docs/postgresql-design-rules.md` — PostgreSQL schema and migration rules.
