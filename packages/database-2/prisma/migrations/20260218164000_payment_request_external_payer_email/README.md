# Payment request: external payer (email-only)

Allows payment requests for recipients that do not yet have a consumer account by making payer_id optional and adding payer_email.

**Reference:** Product (pay-by-email); postgresql-design-rules (nullable FK when optional).

## What this migration does

- Alters payment_request.payer_id to DROP NOT NULL.
- Adds payment_request.payer_email (TEXT, nullable).
- Recreates FK payment_request.payer_id → consumer with ON DELETE SET NULL, ON UPDATE CASCADE.

## Deploy order

1. **Run this migration** (e.g. `npx prisma migrate deploy`).
2. **Deploy the application** that sets payer_email when payer_id is null. Additive; no breaking change.

## Rollback

Alter payer_id SET NOT NULL (fails if any row has null payer_id); drop column payer_email; restore previous FK. Backfill payer_id from another source if needed; prefer fixing forward.