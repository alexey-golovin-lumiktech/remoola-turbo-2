# Consumer: account_type required

Makes consumer.account_type NOT NULL so every consumer has an account type (e.g. BUSINESS, CONTRACTOR).

**Reference:** Schema invariants; no AGENTS/postgresql-design-rules reference.

## What this migration does

- Alters consumer.account_type to SET NOT NULL.

## Deploy order

1. **Backfill** account_type for any consumer with NULL (e.g. default to BUSINESS or CONTRACTOR).
2. **Run this migration** (e.g. `npx prisma migrate deploy`).
3. **Deploy the application** that always sets account_type.

## Rollback

Alter column to DROP NOT NULL. No data loss; low-risk rollback.