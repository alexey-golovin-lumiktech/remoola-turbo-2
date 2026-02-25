# Payment request attachment: unique per (payment_request_id, requester_id, resource_id)

Enforces at most one attachment of the same resource per request by the same requester.

**Reference:** Business uniqueness; postgresql-design-rules (unique constraints).

## What this migration does

- Creates unique index on payment_request_attachment(payment_request_id, requester_id, resource_id).

## Deploy order

1. **Resolve duplicates** if any exist (migration fails otherwise).
2. **Run this migration** (e.g. `npx prisma migrate deploy`).
3. **Deploy the application** that relies on this uniqueness.

## Rollback

Drop the unique index. Duplicate attachments become possible again; no data loss.