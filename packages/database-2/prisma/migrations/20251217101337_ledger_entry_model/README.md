# Ledger entry: unique (payment_request_id, ledger_id, type)

Enforces at most one ledger entry per (payment_request_id, ledger_id, type) combination.

**Reference:** Business uniqueness for ledger; postgresql-design-rules (unique constraints).

## What this migration does

- Creates unique index ledger_entry_payment_request_id_ledger_id_type_key on ledger_entry(payment_request_id, ledger_id, type).

## Deploy order

1. **Resolve duplicates** if any (migration fails otherwise).
2. **Run this migration** (e.g. `npx prisma migrate deploy`).
3. **Deploy the application** that relies on this constraint.

## Rollback

Drop the unique index. Duplicate (request, ledger, type) rows become possible; no data loss.