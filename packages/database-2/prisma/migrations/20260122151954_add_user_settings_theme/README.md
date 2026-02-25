# User settings (consumer): theme and table

Adds per-consumer UI settings (theme: LIGHT, DARK, SYSTEM).

**Reference:** timestamps on mutable tables; postgresql-design-rules (created_at, updated_at).

## What this migration does

- Creates enum theme_enum (LIGHT, DARK, SYSTEM).
- Creates table user_settings (id, theme, consumerId unique, created_at, updated_at, deleted_at) with FK to consumer ON DELETE CASCADE. Adds uniques on consumerId and (consumerId, deleted_at).

## Deploy order

1. **Run this migration** (e.g. `npx prisma migrate deploy`).
2. **Deploy the application** that reads/writes user_settings (theme). Additive only.

## Rollback

Drop table user_settings; drop type theme_enum. All user settings data is lost.
