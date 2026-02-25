# Stripe webhook event deduplication

This migration adds a table to enforce **at-most-once** processing of Stripe webhook events by storing each processed `event.id`. The application inserts into this table before handling the event; duplicate deliveries (replays, retries) hit a unique constraint and return 200 without reprocessing.

**Reference:** postgresql-design-rules.md Rule 27.

## What this migration does

- Creates `stripe_webhook_event` with `id`, `event_id`, `created_at`, `updated_at`.
- Adds `UNIQUE` on `event_id` so the same Stripe event cannot be processed twice.

## Deploy order

1. **Run this migration** (e.g. `npx prisma migrate deploy`).
2. **Deploy the application** that inserts into `stripe_webhook_event` at webhook entry and handles unique violation (P2002) by returning 200 without processing.

Additive only; no existing tables or data are modified. Safe to run anytime.

## Rollback

If you need to remove the table: `DROP TABLE "stripe_webhook_event";`. The app must be updated to not depend on this table before rollback.
