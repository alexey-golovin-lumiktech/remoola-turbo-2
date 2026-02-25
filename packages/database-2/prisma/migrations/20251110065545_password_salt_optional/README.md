# Consumer: password and salt optional

Makes consumer.password and consumer.salt nullable to support OAuth-only consumers without local credentials.

**Reference:** Auth strategy (OAuth + optional local); no AGENTS/postgresql-design-rules reference.

## What this migration does

- Alters consumer.password and consumer.salt to DROP NOT NULL.

## Deploy order

1. **Run this migration** (e.g. `npx prisma migrate deploy`).
2. **Deploy the application** that allows null password/salt for OAuth users.

## Rollback

Alter columns back to SET NOT NULL. Fails if any row has NULL; set defaults or backfill before rollback.