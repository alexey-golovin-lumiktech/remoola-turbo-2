# FK ON UPDATE: CASCADE for address_details and personal_details

Changes foreign keys so that updates to consumer.id propagate to address_details and personal_details.

**Reference:** postgresql-design-rules.md Rule 7 (ON DELETE/UPDATE).

## What this migration does

- Drops and re-adds FKs for address_details.consumerId and personal_details.consumerId with `ON UPDATE CASCADE` (in addition to existing ON DELETE CASCADE).

## Deploy order

1. **Run this migration** (e.g. `npx prisma migrate deploy`).
2. No application change required.

## Rollback

Re-add FKs with `ON UPDATE NO ACTION`. No data impact; low-risk rollback.