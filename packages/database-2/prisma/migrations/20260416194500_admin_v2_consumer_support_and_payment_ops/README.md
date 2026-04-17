# Admin-v2 consumer support and payment ops

This migration is additive-only.

## Changes

- adds narrow suspension marker columns to `consumer`:
  - `suspended_at`
  - `suspended_by`
  - `suspension_reason`
- seeds exact admin-v2 support capabilities:
  - `consumers.suspend`
  - `consumers.email_resend`

## Safety expectations

- Apply the database migration before deploying runtime code that reads `ConsumerModel.suspendedAt`.
- Treat rollback as forward-fix. Do not deploy runtime expecting the new columns against a pre-migration database.
- No backfill is required because the new suspension fields are nullable and start empty.

## Release checks

1. Confirm the `consumer` table has the three new suspension columns.
2. Confirm `SUPER_ADMIN` resolves the two new capabilities through schema-backed RBAC.
3. Confirm `OPS_ADMIN` still receives `403` on the new support mutations.
