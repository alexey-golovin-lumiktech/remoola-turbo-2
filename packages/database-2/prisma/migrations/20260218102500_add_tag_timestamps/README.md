# Tag tables: add created_at and updated_at

Adds mandatory timestamps to document_tag and resource_tag for audit and ETL.

**Reference:** postgresql-design-rules.md Rule 2 (created_at, updated_at on mutable tables).

## What this migration does

- Adds created_at and updated_at (TIMESTAMPTZ, nullable then backfilled, then NOT NULL with default) to document_tag and resource_tag.

## Deploy order

1. **Run this migration** (e.g. `npx prisma migrate deploy`). Backfill runs inside the migration.
2. **Deploy the application** if it relies on these columns. Additive; no breaking change.

## Rollback

Alter tables to DROP COLUMN created_at and updated_at. Timestamp data is lost; low risk for tag tables.
