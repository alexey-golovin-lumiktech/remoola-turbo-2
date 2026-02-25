# Enums: human-readable values (account type, admin type, contractor kind)

Alters account_type_enum, admin_type_enum, and contractor_kind_enum to PascalCase display values (e.g. `Business`, `Contractor`). Sets `admin.type` to TEXT temporarily for the transition.

**Reference:** Application display requirements; no AGENTS/postgresql-design-rules reference.

## What this migration does

- Creates new enum types with PascalCase values; drops old enums.
- Alters `admin.type` column to TEXT (temporary).

## Deploy order

1. **Run this migration** (e.g. `npx prisma migrate deploy`).
2. **Deploy the application** that uses the new enum values.

## Rollback

Recreate old enums and alter admin.type back. Existing data must be compatible with old values; otherwise backfill or fix forward.