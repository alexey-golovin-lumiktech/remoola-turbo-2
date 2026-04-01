# Auth session access-token binding migration notes

This migration is additive-only and adds nullable `access_token_hash` to `auth_sessions`.

## Safety expectations

- Apply the migration before any `api-v2` runtime that reads `AuthSessionModel.accessTokenHash`.
- Existing sessions are intentionally left with `NULL` in `access_token_hash`.
- New or rotated consumer sessions will populate `access_token_hash` on token issuance.

## Why nullable is intentional

Historical consumer access tokens cannot be backfilled safely because the server does not retain the plaintext access token needed to derive the new hash.

Using a nullable column preserves compatibility for already-issued sessions while allowing all new sessions to enforce exact access-token binding.

## Verification checklist

Run and capture outputs in CI/staging:

1. `yarn workspace @remoola/api-v2 test --runInBand src/guards/auth.guard.spec.ts src/consumer/auth/auth.service.issue-tokens.spec.ts`
2. `yarn workspace @remoola/api-v2 test --runInBand src/consumer/modules/payments/consumer-payments.concurrency.spec.ts src/consumer/modules/exchange/consumer-exchange.concurrency.spec.ts`
3. `yarn workspace @remoola/api-v2 lint`

Operational validation after migrate:

- Confirm the new `auth_sessions.access_token_hash` column exists in the target database.
- Confirm existing sessions without `access_token_hash` continue to authenticate during the transition window.
- Confirm a fresh login or refresh writes `access_token_hash` and consumer API requests succeed with the new guard check.

## Suggested schema evidence query

```sql
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = current_schema()
  AND table_name = 'auth_sessions'
  AND column_name = 'access_token_hash';
```

## Abort / retry playbook

If the migration is not yet applied in an environment:

1. Stop runtime rollout for this change set.
2. Apply the migration.
3. Re-run the schema evidence query.
4. Re-run fresh login plus consumer API smoke validation.
5. Continue only after all release-gate evidence is collected.
