# FK ON UPDATE: NO ACTION for consumer/detail FKs

Sets all touched foreign keys to `ON UPDATE NO ACTION` so parent key updates do not propagate automatically.

**Reference:** postgresql-design-rules.md Rule 7 (ON DELETE/UPDATE).

## What this migration does

- Drops and re-adds FKs for address_details, consumer_resource, contact, google_profile_details, organization_details, payment_method, personal_details, reset_password, transaction with `ON UPDATE NO ACTION` (ON DELETE CASCADE kept where applicable).

## Deploy order

1. **Run this migration** (e.g. `npx prisma migrate deploy`).
2. No application change required.

## Rollback

Re-add FKs with previous ON UPDATE behavior. No data impact; low-risk rollback.