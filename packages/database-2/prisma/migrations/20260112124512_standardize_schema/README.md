# Standardize schema: timestamps, types, idempotency, uniques

Large migration: enforces created_at/updated_at NOT NULL, adds ledger idempotency_key, alters column types, and adds soft-delete–aware uniques.

**Reference:** timestamps, idempotency, postgresql-design-rules (NOT NULL, uniques).

## What this migration does

- Sets created_at and updated_at NOT NULL on many tables; adds ledger_entry.idempotency_key (VARCHAR) and unique on it; alters stripe_id, created_by, updated_by, deleted_by (ledger_entry) and other columns to VARCHAR(255) or new types.
- Drops payment_method.billing_details_id FK; makes billing_details_id nullable; drops/recreates resource.access as enum; drops and creates many indexes (contact, exchange_rate, payment_method, payment_request_attachment, ledger_entry, etc.) for soft-delete semantics.

## Deploy order

1. **Backfill** created_at/updated_at and idempotency_key where required; ensure no duplicate idempotency_key or unique key pairs.
2. **Run this migration** (e.g. `npx prisma migrate deploy`).
3. **Deploy the application** that uses NOT NULL timestamps and idempotency.

## Rollback

Revert NOT NULL, column types, and indexes to previous state. Complex; prefer fixing forward. Back up data before rollback.
