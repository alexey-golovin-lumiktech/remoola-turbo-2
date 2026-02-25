# Remoola

Remoola is a Turborepo monorepo for the Remoola platform: a NestJS API plus two Next.js frontends (admin and consumer). The repo also contains shared types, UI primitives, and Prisma database tooling.

## Repo layout

```text
.
├── apps
│   ├── api            # NestJS backend (REST APIs)
│   ├── admin          # Next.js admin dashboard
│   └── consumer       # Next.js consumer portal
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

# build & start
yarn build
yarn start

# lint & format
yarn lint
yarn format

# tests (run only in local dev; blocked in CI/Vercel by scripts/ensure-local-development.js)
yarn test
yarn test:e2e

# database (Prisma)
yarn db:generate
yarn db:migrate:dev
yarn db:migrate:deploy
yarn db:push
yarn db:seed
```

## Documentation

- `README.md` — this file (setup, commands, repo layout).
- `PROJECT_SUMMARY.md` — high-level project overview (start here).
- `PROJECT_DOCUMENTATION.md` — overview of API (base path `/api`), admin, consumer, and database.
- `FEATURES_CURRENT.md` — implemented features and current repo state.
- `docs/FINANCIAL_SAFETY_AND_DB_COMPLIANCE.md` — fintech safety, ledger invariants, idempotency.
- `docs/postgresql-design-rules.md` — PostgreSQL schema and migration rules.
