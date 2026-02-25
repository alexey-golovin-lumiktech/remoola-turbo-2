# System redesign: transaction → ledger_entry

Replaces the transaction table with a double-entry ledger model (ledger_entry).

**Reference:** postgresql-design-rules (ledger/money).

## What this migration does

- Drops table transaction and its FKs.
- Creates enum ledger_entry_type_enum and table ledger_entry (id, ledger_id, type, currencyCode, status, amount, feesType, feesAmount, stripe_id, metadata, consumer_id, payment_request_id, created_by/updated_by/deleted_by, timestamps).
- Creates indexes on consumer_id and ledger_id; FKs to consumer and payment_request.

## Deploy order

1. **Migrate transaction data** to ledger_entry in a separate ETL if history must be preserved; otherwise accept data loss.
2. **Run this migration** (e.g. `npx prisma migrate deploy`).
3. **Deploy the application** that uses ledger_entry instead of transaction.

## Rollback

Recreate transaction table and FKs; drop ledger_entry. Ledger_entry data is lost unless exported first. Restore transaction data from backup or ETL if needed.
