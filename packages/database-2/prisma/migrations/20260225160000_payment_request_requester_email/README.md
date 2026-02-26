# Payment request: requester_email and optional requester_id

Allows payment requests where requester may not yet have a consumer account by making requester_id optional and adding requester_email. Mirrors the existing payer_id/payer_email pattern.

**Reference:** Product (requester-pay-by-email); postgresql-design-rules (nullable FK when optional).

## What this migration does

- Alters payment_request.requester_id to DROP NOT NULL.
- Adds payment_request.requester_email (TEXT, nullable).
- Updates FK payment_request.requester_id → consumer to ON DELETE SET NULL, ON UPDATE CASCADE.

## Deploy order

1. **Run this migration** (e.g. `npx prisma migrate deploy`).
2. **Deploy the application** that sets requester_email when requester_id is null. Additive; no breaking change for existing rows.

## Rollback

Alter requester_id SET NOT NULL (fails if any row has null requester_id); drop column requester_email; restore previous FK. Backfill requester_id from another source if needed; prefer fixing forward.
