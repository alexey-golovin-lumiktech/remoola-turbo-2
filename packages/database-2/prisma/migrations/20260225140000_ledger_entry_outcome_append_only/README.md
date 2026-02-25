# Ledger entry outcome and dispute (append-only)

This migration introduces **append-only** tables for ledger status transitions and dispute metadata, so the application never updates or deletes rows in `ledger_entry` (financial history). Status and dispute data are recorded by inserting into these tables; balance queries derive effective status via `COALESCE(latest outcome.status, ledger_entry.status)` using a LATERAL join.

**Reference:** postgresql-design-rules.md Rule 28.

## What this migration does

- **`ledger_entry_outcome`** — One row per status transition (e.g. WAITING → COMPLETED). Columns: `ledger_entry_id`, `status`, `source`, `external_id`, `created_at`. Indexes on `(ledger_entry_id, created_at DESC)` and `external_id` (partial, for lookups by Stripe id).
- **`ledger_entry_dispute`** — One row per dispute event. Columns: `ledger_entry_id`, `stripe_dispute_id`, `metadata` (JSONB), `created_at`. Index on `ledger_entry_id`.

Both tables have FKs to `ledger_entry(id)` with `ON DELETE CASCADE` (if a ledger entry were ever removed, its outcome/dispute rows are cleaned up).

## Deploy order

1. **Run this migration** (e.g. `npx prisma migrate deploy`).
2. **Deploy the application** that writes status changes and dispute data via `LedgerEntryOutcomeModel.create` and `LedgerEntryDisputeModel.create` instead of updating `ledger_entry`.

Additive only; no columns or data in `ledger_entry` are changed. Existing balance queries must be updated to use the LATERAL join for effective status (already done in the same release).

## Rollback

Dropping these tables is only safe if the app no longer inserts into them and no longer reads effective status from them. Prefer leaving tables in place; reversals use compensating ledger entries, not in-place updates.
