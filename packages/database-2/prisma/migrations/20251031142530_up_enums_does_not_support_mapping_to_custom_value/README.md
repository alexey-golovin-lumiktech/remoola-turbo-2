# Enums: uppercase values for Prisma compatibility

Converts enum values to UPPERCASE (e.g. `BUSINESS`, `CONTRACTOR`, `INDIVIDUAL_ENTREPRENEUR`) so Prisma enum mapping works correctly when display values differ from DB values.

**Reference:** Prisma enum handling; no AGENTS/postgresql-design-rules reference.

## What this migration does

- Alters all touched enums to UPPERCASE values using new type + `USING` cast to migrate existing data.
- Affects: account_type_enum, admin_type_enum, contractor_kind_enum, legal_status_enum, organization_size_enum, payment_method_type_enum, resource_access_enum, transaction_action_type_enum, transaction_fees_type_enum, transaction_status_enum, transaction_type_enum.

## Deploy order

1. **Run this migration** (e.g. `npx prisma migrate deploy`).
2. **Deploy the application** (Prisma client) that expects UPPERCASE enum values.

## Rollback

Recreate enums with previous (PascalCase) values and alter columns with USING cast. Possible but invasive; prefer fixing forward.