# Remoola

Remoola is a Turborepo monorepo for the Remoola payments and FX platform. The current repo contains two NestJS backends, four Next.js frontends, and shared packages for API contracts, database access, security utilities, testing, and UI primitives.

## Repo layout

```text
.
├── apps
│   ├── api                # Legacy backend authority for consumer + consumer-mobile
│   ├── api-v2             # Backend authority for consumer-css-grid and current auth-sensitive cutovers
│   ├── admin              # Next.js admin dashboard (port 3010)
│   ├── consumer           # Next.js consumer web app (port 3001)
│   ├── consumer-mobile    # Next.js mobile-first consumer app (port 3002)
│   └── consumer-css-grid  # Next.js css-grid consumer app (port 3003)
└── packages
    ├── api-e2e            # Shared Jest e2e configs
    ├── api-types          # Shared API contracts, DTOs, auth/cookie helpers
    ├── database-2         # Prisma schema, migrations, generated client
    ├── db-fixtures        # Database fixtures for tests
    ├── eslint-config      # Shared ESLint config
    ├── jest-config        # Shared Jest config
    ├── security-utils     # Crypto, token hashing, OAuth helpers
    ├── shared-constants   # Shared constants
    ├── test-db            # Test DB and Testcontainers helpers
    ├── typescript-config  # Shared tsconfig presets
    └── ui                 # Shared UI components
```

## Prerequisites

- Node.js `>= 18`
- Yarn `1.22.22`
- PostgreSQL for local development
- Docker for local test/e2e flows that use `@remoola/test-db` and Testcontainers

Use either `localhost` everywhere or `127.0.0.1` everywhere when working on cookie/OAuth flows. Mixed-host local setups are intentionally unsupported.

## Getting started

1. Install dependencies:

```bash
yarn
```

2. Copy the env templates you actually need:

```bash
cp packages/database-2/.env.example packages/database-2/.env

cp apps/api/.env.example apps/api/.env
cp apps/admin/.env.example apps/admin/.env
cp apps/consumer/.env.example apps/consumer/.env
cp apps/consumer-mobile/.env.example apps/consumer-mobile/.env

# only if you work on the api-v2 / css-grid surface
cp apps/api-v2/.env.example apps/api-v2/.env
cp apps/consumer-css-grid/.env.example apps/consumer-css-grid/.env
```

3. Generate the Prisma client:

```bash
yarn db:generate
```

4. Start the full monorepo or only the surfaces you need:

```bash
# everything
yarn dev

# targeted development
yarn dev:api
yarn dev:api-v2
yarn dev:admin
yarn dev:consumer
yarn dev:consumer-mobile
yarn dev:consumer-css-grid
```

Default local ports from the current app scripts and env examples:

- `apps/api`: `3333`
- `apps/api-v2`: `3334`
- `apps/admin`: `3010`
- `apps/consumer`: `3001`
- `apps/consumer-mobile`: `3002`
- `apps/consumer-css-grid`: `3003`

## Common commands

```bash
# build, lint, typecheck
yarn build
yarn lint
yarn typecheck
yarn format

# tests (local development only; blocked in CI/Vercel)
yarn test
yarn test:e2e
yarn test:e2e:fast
yarn workspace @remoola/api test:e2e:fast
yarn workspace @remoola/api-v2 test:e2e:fast

# database (Prisma)
yarn db:generate
yarn db:validate
yarn db:migrate
yarn db:deploy
yarn db:studio
```

## Workflow notes

- Root `yarn dev` runs all workspace `dev` tasks in parallel and depends on `db:generate` through `turbo.json`.
- Root `yarn build` generates the Prisma client first, then runs the Turborepo build pipeline.
- `.husky/pre-commit` skips lint/tests for docs-only commits. For code changes it runs `yarn lint`, builds `@remoola/test-db`, then runs consumer unit tests, api unit tests, and `apps/api` fast e2e.
- `build:vercel-guard` now covers both legacy and v2 consumer release surfaces, including `@remoola/api-v2` and `@remoola/consumer-css-grid`.
- Use `yarn verify:v2-apps` as the dedicated pre-PR / pre-production gate for the `api-v2` + `consumer-css-grid` release surface.

## Deployment notes

- Apply database migrations before deploying runtime changes that depend on new Prisma fields.
- Verify Me / Stripe Identity rollout requires migration `20260323120000_stripe_identity_consumer_state` before runtime deployment because auth and consumer reads expect the `stripe_identity_*` columns to exist.
- Auth/cookie/cutover changes for the consumer surfaces are documented as coordinated releases, not as independent rolling deployments.
- The repo currently has no `vercel.json` or `vercel.ts`; production deployment for `apps/api-v2` and `apps/consumer-css-grid` therefore depends on Vercel dashboard/project configuration plus the canonical origin env contract documented in `docs/API_V2_PRODUCTION_RELEASE_GATE.md`.

## Documentation map

Start here:

- `README.md` - repo layout, setup, commands, and doc index
- `docs/PROJECT_SUMMARY.md` - concise current-state summary and navigation map

Current-state references:

- `docs/PROJECT_DOCUMENTATION.md` - consolidated API, app, package, and DB overview
- `docs/FEATURES_CURRENT.md` - implemented features and current repo state

Operational and release docs:

- `docs/CONSUMER_AUTH_COOKIE_POLICY.md` - canonical browser/BFF cookie contract
- `docs/API_V2_PRODUCTION_RELEASE_GATE.md` - required evidence for auth-sensitive `api-v2` releases
- `docs/SWAGGER_COOKIE_AUTH_USAGE.md` - same-origin Swagger cookie-auth workflow
- `docs/CONSUMER_AUTH_CUTOVER_RELEASE_HANDOFF.md` - release-specific handoff and closure notes
- `docs/CONSUMER_BROWSER_IDENTITY_TRACKING.md` - browser identity and consumer action-log contracts
- `docs/FINANCIAL_SAFETY_AND_DB_COMPLIANCE.md` - fintech safety, ledger invariants, idempotency

Governance docs:

- `docs/project-design-rules.md` - project design rules and boundaries
- `docs/postgresql-design-rules.md` - PostgreSQL schema and migration rules
