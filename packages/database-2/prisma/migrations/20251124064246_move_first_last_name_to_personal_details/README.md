# Move first_name and last_name from consumer to personal_details

Moves first and last name from consumer to personal_details so PII is in the details table.

**Reference:** Schema normalization; no AGENTS/postgresql-design-rules reference.

## What this migration does

- Drops consumer.first_name and consumer.last_name.
- Adds personal_details.first_name and personal_details.last_name (VARCHAR(255), nullable).

## Deploy order

1. **Backfill** personal_details.first_name and last_name from consumer if data must be preserved.
2. **Run this migration** (e.g. `npx prisma migrate deploy`).
3. **Deploy the application** that reads/writes first/last name on personal_details.

## Rollback

Re-add first_name/last_name to consumer and drop from personal_details; backfill consumer from personal_details if needed. Data in consumer is lost unless backed up.