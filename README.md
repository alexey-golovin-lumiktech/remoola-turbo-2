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
    ├── env               # Shared env schema helpers
    ├── eslint-config     # ESLint + Prettier configs
    ├── jest-config       # Jest configs
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

# tests
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

- `PROJECT_DOCUMENTATION.md` contains a deeper overview of API, admin, consumer, and database features.
- `FEATURES_CURRENT.md` lists features that are implemented and present in the repo now.