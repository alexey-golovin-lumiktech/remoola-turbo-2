# Remoola API v2

NestJS backend for the Remoola monorepo. This app serves the canonical
`consumer-css-grid` surface together with the admin APIs under the global `/api`
prefix.

## Run locally

From the repo root:

```bash
yarn workspace @remoola/api-v2 dev
```

Useful checks:

```bash
yarn workspace @remoola/api-v2 test
yarn workspace @remoola/api-v2 test:e2e
yarn workspace @remoola/api-v2 lint
```

If workspace packages are stale, build the shared packages first from the repo
root before running API-only commands.

## Key route areas

- `POST /api/admin-v2/auth/*` and `POST /api/consumer/auth/*` for cookie-based auth
- `GET /api/consumer/dashboard` for dashboard aggregation
- `GET|PATCH /api/consumer/settings` and `GET|PUT /api/consumer/settings/theme`
  for consumer theme and preferred-currency preferences
- `POST /api/consumer/verification/sessions` for canonical Stripe Identity
  Verify Me session start / reuse
- `POST /api/consumer/webhooks` for Stripe webhook processing
- `POST /api/consumer/webhook` as a legacy-compatible alias for Stripe webhook
  processing
- `POST /api/consumer/webhooks/stripe/verify/start` as the legacy-compatible
  verification start route that delegates to the canonical verification flow
- `POST /api/consumer/payments/withdraw` and
  `POST /api/consumer/payments/transfer` for money movement subject to KYC
  limits and idempotency

## Current verification behavior

- Consumer verification state is persisted on `consumer` in
  `packages/database-2/prisma/schema.prisma`.
- Stripe Identity lifecycle updates only apply to the active verification
  session; stale webhook events are ignored.
- Shared verification helpers combine Stripe Identity lifecycle with admin review
  status so dashboard, settings, and payment-limit logic use the same effective
  verification rules.

## Docs

- Repo-wide feature map: `docs/FEATURES_CURRENT.md`
- Detailed architecture and route inventory: `docs/PROJECT_DOCUMENTATION.md`
- Financial / DB safety rules: `docs/FINANCIAL_SAFETY_AND_DB_COMPLIANCE.md`

## Notes

- This app depends on shared packages in `packages/*`, especially
  `@remoola/database-2`, `@remoola/api-types`, and `@remoola/env`.
- The maintained admin backend surface is `/api/admin-v2/*`; legacy
  `src/admin/modules/*` is not part of the runtime graph anymore.
- Prefer the repo docs above over generic NestJS starter guidance when making
  changes in this codebase.
