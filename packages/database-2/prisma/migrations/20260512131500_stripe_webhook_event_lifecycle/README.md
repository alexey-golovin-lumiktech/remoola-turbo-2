# Stripe Webhook Event Lifecycle

Adds additive lifecycle columns to `stripe_webhook_event` so webhook delivery dedupe can claim an event before running non-identity handlers, mark successful delivery as processed, and mark transient handler failures as retryable failed claims.

## Deploy Order

1. Run this migration.
2. Deploy app code that writes `PROCESSING`, `PROCESSED`, and `FAILED` statuses.

Existing rows are backfilled as `PROCESSED` because they already represent accepted webhook deliveries.

## Rollback

Rollback requires deploying app code that no longer depends on these columns, then dropping the added columns, check constraint, and status index.
