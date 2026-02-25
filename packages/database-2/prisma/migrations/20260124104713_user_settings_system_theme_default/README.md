# User settings: default theme SYSTEM

Changes the default theme for new user_settings rows from LIGHT to SYSTEM.

**Reference:** Product default; no AGENTS/postgresql-design-rules reference.

## What this migration does

- Alters user_settings.theme default from 'LIGHT' to 'SYSTEM'.

## Deploy order

1. **Run this migration** (e.g. `npx prisma migrate deploy`).
2. **Deploy the application** that respects SYSTEM theme. No breaking change.

## Rollback

Alter column default back to 'LIGHT'. Existing rows unchanged; only new rows affected by default.