# Consumer payments ledger indexes

Adds two partial indexes for the consumer payments hot paths measured in `api-v2`:

- `idx_ledger_entry_payment_request_consumer_latest` supports the payment list status filter LATERAL lookup by `(payment_request_id, consumer_id)` ordered by latest row and keeps `status` as a small include column for that path.
- `idx_ledger_entry_consumer_ledger_latest` supports payment history's latest active entry per `(consumer_id, ledger_id)` using key ordering only; it intentionally avoids wide include columns such as `metadata`.

## Production note

This migration adds two indexes on `ledger_entry`. The history index is intentionally thin (no wide `INCLUDE` columns), while the payment latest-row index keeps only a small `INCLUDE (status)`, which reduces build and lock risk. Prisma still creates them with regular `CREATE INDEX` inside transactional `migrate deploy`, so production rollout should confirm that the current `ledger_entry` size fits the available rollout window; if the table is already large or write rate is high, create the same indexes out of band with `CREATE INDEX CONCURRENTLY` first and then run `migrate deploy`.
