# Remove Knex migration tables

Drops Knex migration tables so Prisma is the single source of truth for migrations.

**Reference:** Migration strategy (Prisma-only); no AGENTS/postgresql-design-rules reference.

## What this migration does

- Drops table `knex_migrations`.
- Drops table `knex_migrations_lock`.

## Deploy order

1. **Run this migration** (e.g. `npx prisma migrate deploy`).
2. No application change required; ensure no process still uses Knex migrations.

## Rollback

Recreate the two tables if you need to restore Knex migration tracking. Table contents are not restored; rollback is structural only.