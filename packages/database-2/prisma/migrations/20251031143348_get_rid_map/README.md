# Rename foreign key constraints to _fkey suffix

Renames FK constraints from `*_foreign` to `*_fkey` for consistent naming with PostgreSQL/Prisma conventions.

**Reference:** Naming conventions; postgresql-design-rules naming cheat sheet.

## What this migration does

- Renames constraints on consumer, consumer_resource, contact, payment_method, payment_request, payment_request_attachment, resource_tag (e.g. `consumer_address_details_id_foreign` → `consumer_address_details_id_fkey`).
- No table or column changes; constraint names only.

## Deploy order

1. **Run this migration** (e.g. `npx prisma migrate deploy`).
2. No application change required.

## Rollback

Rename constraints back to `*_foreign`. No data impact; low-risk rollback.