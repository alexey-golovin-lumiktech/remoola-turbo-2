# Enums: rename value-constraint types to _enum

Replaces Prisma-generated enum type names (e.g. `account_type_value_constraint`) with canonical names (e.g. `account_type_enum`) and keeps the same value sets.

**Reference:** Prisma schema alignment; no AGENTS/postgresql-design-rules reference.

## What this migration does

- Drops old enum types (e.g. `account_type_value_constraint`) and creates new ones (e.g. `account_type_enum`) with identical values.
- No table columns are changed; only enum type definitions.

## Deploy order

1. **Run this migration** (e.g. `npx prisma migrate deploy`).
2. Deploy application that uses the new enum type names.

## Rollback

Recreate the old enum types and drop the new ones. No table data is affected; rollback is low risk if no later migrations depend on the new enum names.