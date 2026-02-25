# Transaction: add metadata JSONB

Adds a nullable JSONB column to transaction for arbitrary payload (e.g. provider references, correlation ids).

**Reference:** postgresql-design-rules.md Rule 24 (JSONB);

## What this migration does

- Adds column transaction.metadata (JSONB, nullable).

## Deploy order

1. **Run this migration** (e.g. `npx prisma migrate deploy`).
2. **Deploy the application** that reads/writes metadata. Additive; no breaking change.

## Rollback

Alter table transaction DROP COLUMN metadata. All metadata content is lost; back up if needed.
