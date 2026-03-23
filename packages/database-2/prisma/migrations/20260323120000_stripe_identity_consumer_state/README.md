# Consumer Stripe Identity state migration notes

This migration is additive-only and adds Stripe Identity session/status tracking columns to `consumer`.

## Safety expectations

- Deploy the database migration before any API or worker runtime that reads `ConsumerModel`.
- Treat rollback as forward-fix: do not deploy app code that expects `stripe_identity_*` columns against a pre-migration database.
- The check constraint on `stripe_identity_status` must remain aligned with the runtime state machine values:
  - `pending_submission`
  - `requires_input`
  - `verified`
  - `canceled`
  - `redacted`

## Why deploy order matters

Auth and consumer-runtime reads load `ConsumerModel`, so schema drift is user-visible immediately. A pre-migration database will fail reads with errors like:

```text
The column `consumer.stripe_identity_status` does not exist in the current database.
```

Do not promote runtime deployment until the migration is applied successfully in the target environment.

## Verification checklist

Run and capture outputs in CI/staging:

1. `yarn workspace @remoola/api test --runInBand src/consumer/modules/payment-methods/stripe-webhook.service.spec.ts`
2. `yarn workspace @remoola/api test --runInBand test/consumer-verification.e2e-spec.ts`
3. `yarn workspace @remoola/api-e2e test -- --runInBand test/consumer-auth-oauth-full-flow.e2e-spec.ts`

Operational validation after migrate:

- Confirm the new `consumer.stripe_identity_*` columns exist in the target database.
- Confirm OAuth login / consumer read paths succeed after rollout.
- Confirm `POST /api/consumer/verification/sessions` creates or reuses a verification session and persists `pending_submission`.
- Confirm managed Stripe webhook events update only the active session state.

## Release gate evidence (required)

Do not promote runtime deployment until all evidence is attached:

1. migration apply output for `20260323120000_stripe_identity_consumer_state`
2. post-migration schema evidence showing all `stripe_identity_*` columns on `consumer`
3. API verification evidence for:
   - consumer verification start route
   - managed Stripe Identity webhook transition
   - OAuth login / consumer lookup after migration

## Suggested schema evidence query

```sql
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = current_schema()
  AND table_name = 'consumer'
  AND column_name LIKE 'stripe_identity_%'
ORDER BY column_name;
```

## Abort / retry playbook

If the migration is not yet applied in an environment:

1. Stop runtime rollout for this change set.
2. Apply the migration.
3. Re-run the schema evidence query.
4. Re-run OAuth login plus consumer verification smoke validation.
5. Continue only after all release-gate evidence is collected.
