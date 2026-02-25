# Wallet FX: auto conversion rules and scheduled conversions

Adds tables for automatic and scheduled FX conversions (wallet_auto_conversion_rule, scheduled_fx_conversion).

**Reference:** timestamps, FKs; postgresql-design-rules (indexes on FKs).

## What this migration does

- Creates enum scheduled_fx_conversion_status_enum (PENDING, PROCESSING, EXECUTED, FAILED, CANCELLED) if not exists.
- Creates table wallet_auto_conversion_rule (consumer_id, from/to currency, target_balance, max_convert_amount, min_interval_minutes, next_run_at, enabled, etc.) with indexes and FK to consumer.
- Creates table scheduled_fx_conversion (consumer_id, from/to currency, amount, status, execute_at, ledger_id, etc.) with indexes and FK to consumer.

## Deploy order

1. **Run this migration** (e.g. `npx prisma migrate deploy`).
2. **Deploy the application** that uses auto/scheduled FX. Additive only.

## Rollback

Drop tables scheduled_fx_conversion and wallet_auto_conversion_rule; drop enum if desired. All rules and scheduled conversions data is lost.
