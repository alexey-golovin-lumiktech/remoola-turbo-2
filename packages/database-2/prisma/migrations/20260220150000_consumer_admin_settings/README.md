# Consumer and admin settings split

Renames user_settings to consumer_settings, adds preferred_currency, and creates a separate admin_settings table.

**Reference:** timestamps; postgresql-design-rules (FKs, uniques).

## What this migration does

- Renames table user_settings to consumer_settings. Adds consumer_settings.preferred_currency (currency_code_enum, nullable).
- Creates table admin_settings (id, theme, adminId, created_at, updated_at, deleted_at) with unique on adminId and (adminId, deleted_at), FK adminId → admin ON DELETE CASCADE.

## Deploy order

1. **Run this migration** (e.g. `npx prisma migrate deploy`).
2. **Deploy the application** that uses consumer_settings and admin_settings (and preferred_currency). Update any references from user_settings to consumer_settings.

## Rollback

Rename consumer_settings back to user_settings; drop column preferred_currency; drop table admin_settings. Admin settings data is lost; consumer_settings data preserved under new name.
