# Personal details: date_of_birth as TIMESTAMP(3)

Changes personal_details.date_of_birth to TIMESTAMP(3) (date with time, millisecond precision).

**Reference:** postgresql-design-rules.md Rule 3 (TIMESTAMPTZ preferred; this uses TIMESTAMP(3) for date-of-birth).

## What this migration does

- Drops column date_of_birth and adds it back as TIMESTAMP(3) NOT NULL. No cast is defined; existing data is lost unless backfilled separately.

## Deploy order

1. **Backfill** or accept data loss if the column had values.
2. **Run this migration** (e.g. `npx prisma migrate deploy`).
3. **Deploy the application** that uses the new type.

## Rollback

Alter column back to previous type with USING cast if possible; otherwise restore from backup. Risk of data loss if backup is not available.