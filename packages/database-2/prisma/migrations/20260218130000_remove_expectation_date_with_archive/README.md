# Payment request: archive expectation_date then drop column

Preserves expectation_date in an archive table before dropping the column from payment_request.

**Reference:** postgresql-design-rules.md Rule 20 (migration plan: preserve then drop);

## What this migration does

- Creates table payment_request_expectation_date_archive (id, payment_request_id, expectation_date, archived_at, migration_tag) with index on payment_request_id.
- If payment_request.expectation_date exists: copies non-null values into archive (with migration_tag), then drops column expectation_date. Conditional via DO block.

## Deploy order

1. **Run this migration** (e.g. `npx prisma migrate deploy`).
2. **Deploy the application** that no longer reads/writes payment_request.expectation_date and uses the archive for history if needed.

## Rollback

Re-add column expectation_date to payment_request; backfill from archive; optionally drop archive table. Archive data can be kept for audit.
