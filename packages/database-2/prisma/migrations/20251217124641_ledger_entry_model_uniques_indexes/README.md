# Ledger entry: unique by (payment_request_id, ledger_id, consumer_id, type)

Extends ledger uniqueness to include consumer_id so payer and requester can each have an entry per request/ledger/type.

**Reference:** Business uniqueness for double-entry; postgresql-design-rules (unique constraints).

## What this migration does

- Drops unique index ledger_entry_payment_request_id_ledger_id_type_key.
- Creates index ledger_entry_payment_request_id_idx and unique index on (payment_request_id, ledger_id, consumer_id, type).

## Deploy order

1. **Run this migration** (e.g. `npx prisma migrate deploy`). Fails if duplicates exist for the new unique key.
2. **Deploy the application** that uses the new uniqueness.

## Rollback

Drop the new unique index and payment_request_id index; recreate the old unique on (payment_request_id, ledger_id, type). Resolve any duplicate (request, ledger, type) rows first if rolling back.