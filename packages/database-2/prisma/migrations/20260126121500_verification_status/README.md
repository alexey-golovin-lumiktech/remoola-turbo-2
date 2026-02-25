# Consumer: verification status and reason

Adds verification workflow fields to consumer (status, reason, updated_at, updated_by).

**Reference:** Compliance/verification; no AGENTS/postgresql-design-rules reference.

## What this migration does

- Creates enum verification_status_enum (PENDING, APPROVED, MORE_INFO, REJECTED, FLAGGED) if not exists.
- Adds consumer columns: verification_status (enum, NOT NULL, default PENDING), verification_reason (TEXT), verification_updated_at (TIMESTAMPTZ), verification_updated_by (UUID). Uses conditional DO block for safe re-runs.

## Deploy order

1. **Run this migration** (e.g. `npx prisma migrate deploy`).
2. **Deploy the application** that uses verification_status and related fields. Additive only.

## Rollback

Alter table consumer DROP COLUMN for the four verification columns; drop type verification_status_enum if unused. Verification data is lost.