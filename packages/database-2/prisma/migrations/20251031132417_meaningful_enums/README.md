# Enums: human-readable display values (fees, legal status, payment method, etc.)

Alters several enums to use display-friendly values (e.g. `Fees Included` instead of `fees_included`, `Sole Trader` instead of `Sole trader`).

**Reference:** Application display requirements; no AGENTS/postgresql-design-rules reference.

## What this migration does

- Alters enums: fees_type_enum, legal_status_enum, payment_method_type_enum, resource_access_enum, transaction_action_type_enum, transaction_status_enum, transaction_type_enum (new display-style values).
- Alters `admin.type` column to use TEXT for transition.

## Deploy order

1. **Run this migration** (e.g. `npx prisma migrate deploy`).
2. **Deploy the application** that expects the new enum values. Ensure app is in sync to avoid value mismatches.

## Rollback

Recreate previous enum values and alter columns back. Existing rows with new values must be mapped back to old values or data loss occurs; prefer fixing forward.