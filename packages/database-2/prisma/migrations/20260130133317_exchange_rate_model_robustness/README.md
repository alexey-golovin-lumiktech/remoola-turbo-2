# Exchange rate: status, effective_at, provider, and dedup

Adds approval workflow, effective_at, and provider fields to exchange_rate; de-duplicates by (from_currency, to_currency, effective_at, deleted_at).

**Reference:** postgresql-design-rules (unique constraints, indexes); indexing.

## What this migration does

- Creates enum ExchangeRateStatus (DRAFT, APPROVED, DISABLED); adds columns approved_at, approved_by, confidence, created_by, effective_at, expires_at, fetched_at, provider, provider_rate_id, rate_ask/rate_bid, spread_bps, status, updated_by.
- Backfills effective_at from created_at; de-duplicates with ROW_NUMBER and adjusts effective_at for duplicates.
- Drops old unique; creates new unique on (from_currency, to_currency, effective_at, deleted_at) and new indexes. Renames indexes on scheduled_fx_conversion and wallet_auto_conversion_rule.

## Deploy order

1. **Run this migration** (e.g. `npx prisma migrate deploy`). Backfill and dedup run inside the migration.
2. **Deploy the application** that uses exchange rate status and effective_at.

## Rollback

Drop new columns and indexes; restore old unique. Backfill effective_at and dedup logic would need to be reversed or data restored from backup; prefer fixing forward.
