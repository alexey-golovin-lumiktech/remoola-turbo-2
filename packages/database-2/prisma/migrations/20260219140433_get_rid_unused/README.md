# Remove unused: payment_request_expectation_date_archive

Drops the expectation_date archive table after migration/audit is complete or when the feature is retired.

**Reference:** Cleanup; no AGENTS/postgresql-design-rules reference.

## What this migration does

- Drops table payment_request_expectation_date_archive (if it exists).

## Deploy order

1. **Run this migration** (e.g. `npx prisma migrate deploy`).
2. **Deploy the application** that no longer reads from the archive. Ensure no process depends on this table.

## Rollback

Recreate the table and indexes from the migration that created it (20260218130000). Data is not restored; export before drop if history must be kept.