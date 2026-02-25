# Consumer: required password/salt, optional verified flags

Makes consumer credentials required and verification flags optional so all consumers have credentials while verification can be incomplete.

**Reference:** Auth/schema requirements; no AGENTS/postgresql-design-rules reference.

## What this migration does

- Sets consumer.password and consumer.salt to NOT NULL.
- Sets consumer.verified and consumer.legal_verified to nullable.

## Deploy order

1. **Run this migration** (e.g. `npx prisma migrate deploy`). Fails if any consumer has NULL password or salt; backfill first if needed.
2. **Deploy the application** that no longer relies on verified/legal_verified being non-null.

## Rollback

Make password/salt nullable again and verified/legal_verified NOT NULL (with defaults if needed). Restore any NULL credentials if they existed.