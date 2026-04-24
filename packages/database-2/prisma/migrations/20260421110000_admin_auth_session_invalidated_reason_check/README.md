# Admin auth session `invalidated_reason` typed allowlist (CHECK constraint)

Slice **MVP-3.5d** companion to
[`docs/admin-v2-mvp-3.5d-session-management-observability.md`](../../../../../docs/admin-v2-mvp-3.5d-session-management-observability.md).

## Purpose

Replaces the free-form `admin_auth_sessions.invalidated_reason TEXT NULL`
column semantics with a DB-enforced typed allowlist via the new
`admin_auth_session_invalidated_reason_check` CHECK constraint. After this
migration the column accepts `NULL` (active session) or one of seven
canonical literals:

```
rotated
manual_revoke
cross_admin_revoked
logout
refresh_reuse_detected
password_reset
admin_deactivated
```

No table is created, no column is added, no index is touched. The column
type stays `TEXT` and the schema-side declaration in
`packages/database-2/prisma/schema.prisma` (line 77) is **not** modified.

## Why now / phase

This is the final **Risk 13** mitigation step. Prior steps landed:

- 3.5a — backend hardening (plaintext fallback retirement,
  `admin_session_revoke` audit baseline).
- 3.5b — admin-v2 frontend URL migration to `/api/admin-v2/auth/*`.
- 3.5c — legacy `apps/api-v2/src/admin/auth/admin-auth.controller.ts`
  retirement.

Without a typed allowlist the lifecycle column is opaque to operator
tooling: a free-form `TEXT` cannot be safely surfaced in `/me/sessions`
or `/admins/:id/sessions` without runtime guesswork on what each literal
means. The CHECK constraint pins the contract at the DB boundary so
downstream session-management UI and the `auth_refresh_reuse` evaluator
can reason about lifecycle states without per-call defensive parsing.

## Why CHECK constraint, not Postgres ENUM

[`.cursor/skills/migration-safety/SKILL.md`](../../../../../.cursor/skills/migration-safety/SKILL.md)
line 8 is unambiguous: "Avoid DB enums; use CHECK constraints". Landed
precedent that this migration follows literally:

- [`20260421100000_admin_v2_saved_views_foundation/migration.sql`](../20260421100000_admin_v2_saved_views_foundation/migration.sql)
  shipped `saved_view_workspace_check` as a `CHECK (workspace IN (...))`,
  not a `CREATE TYPE workspace_enum`.
- [`20260421100500_admin_v2_operational_alerts_foundation/migration.sql`](../20260421100500_admin_v2_operational_alerts_foundation/migration.sql)
  shipped `operational_alert_workspace_check` the same way.
- [`20260421101000_admin_v2_verification_queue_workspace/migration.sql`](../20260421101000_admin_v2_verification_queue_workspace/migration.sql)
  evolved both via `DROP CONSTRAINT + ADD CONSTRAINT` inside a single
  `prisma migrate deploy` transaction.

ENUM evolution would require either (a) `ALTER TYPE ... ADD VALUE`
(irreversible, no rollback DDL); or (b) drop + recreate the type
(impossible while a column references the type without first migrating
every row to NULL). Both are strictly worse than CHECK for this column,
which has a small (seven-value + NULL) allowlist and a single Prisma
client writer.

## Backfill strategy

Two `UPDATE` statements run before `ADD CONSTRAINT`:

1. **Fixture-only literal canonicalization.** The fixture file
   `packages/db-fixtures/src/admin-v2-scenarios.ts` carried
   `'fixture_force_logout_after_risk_review'` until 3.5d. Production
   never wrote this value (it lives only in fixture seed data, used by
   local/test environments). The `UPDATE` rewrites it to
   `'admin_deactivated'`, which is semantically the closest canonical
   value (a forced logout after a risk review is operationally identical
   to the cascade triggered by an admin deactivate). The fixture source
   itself is updated in the same slice to write `'admin_deactivated'`
   directly.
2. **Defensive drift canonicalization.** Any non-canonical literal that
   may have been hand-written by drift (script-driven seeds, admin
   debugger sessions, partially-rolled-back prior slices) is rewritten
   to `'manual_revoke'`. This preserves the row (revokedAt, lastUsedAt
   stay intact for forensic evidence) while making the new CHECK
   applicable. Rationale: silently dropping an unknown row would lose
   evidence; allowing the CHECK to reject the migration would block all
   deploys until manual reconciliation.

Both backfill `UPDATE`s are idempotent: a second run finds zero matching
rows and is a no-op.

## Why no `IF NOT EXISTS` on `ADD CONSTRAINT`

`ADD CONSTRAINT IF NOT EXISTS` would silently no-op when the constraint
already exists. That is precisely the wrong behaviour for a brand-new
constraint: if the constraint is already present, the deployment target
has drifted from the assumed history (e.g. a prior failed attempt was
manually committed by hand), and we want the deploy to fail loudly
rather than declare a phantom success.

## Why no `NOT VALID + VALIDATE` two-step

`admin_auth_sessions` is a small table (active admin user count × admin
session lifespan ≈ low thousands of rows in steady state). The full
constraint-validation pass takes milliseconds. The
`NOT VALID + VALIDATE` pattern is reserved for tables where re-scanning
every row under an `ACCESS EXCLUSIVE` lock would cause a noticeable
production stall — that threshold is millions of rows for a typical
Postgres deployment, far above this table's footprint.

The backfill `UPDATE`s above canonicalize every non-canonical literal
**before** `ADD CONSTRAINT` runs, so the validation pass cannot find a
violation. If a deploy fails on the `ADD CONSTRAINT` step, that means
the operator must inspect what other writer is producing literals
outside the allowlist before re-deploying.

## Application impact

Zero downtime expected:

- The lock window is held for milliseconds because the table is tiny.
- All existing rows satisfy the new predicate after the backfill
  `UPDATE`s.
- Application code (`ADMIN_AUTH_SESSION_REVOKE_REASONS` const in
  `apps/api-v2/src/admin/auth/admin-auth-session-reasons.ts` and all
  call-sites in `admin-auth.service.ts` /
  `admin-v2-admins.service.ts`) is updated in the same slice, so reads
  and writes using only canonical literals become valid the moment both
  DB and code are deployed.

## Rollback plan

```sql
ALTER TABLE "admin_auth_sessions"
DROP CONSTRAINT "admin_auth_session_invalidated_reason_check";
```

Drop is unconditional and instantaneous (no data loss). The backfill
`UPDATE`s are intentionally **not** rolled back: rewriting a row from
`'manual_revoke'` back to a previous unknown literal would require
storing the original value first, which is out of scope for this slice.
The defensive backfill is by design a forward-only operation.

## Reassessment threshold

The `CHECK ("invalidated_reason" IS NULL OR ... IN (...))` shape scales
linearly with allowlist size. Once the list reaches roughly ten values,
or whenever a lifecycle transition stops mapping cleanly onto a free-form
text value (e.g. needing per-state metadata such as `revoked_by_admin_id`
or `revoke_evidence_id`), reconsider:

- Move the allowlist into a lookup table
  (`admin_auth_session_revoke_reason_catalog(id text PK, label text,
...)`) referenced via FK; or
- Promote the allowlist to a Postgres ENUM type, accepting the
  ENUM-evolution cost.

Until then, a single CHECK constraint per slice remains the
cheapest-and-safest evolution path and is consistent with
[`.cursor/skills/migration-safety/SKILL.md`](../../../../../.cursor/skills/migration-safety/SKILL.md)
("avoid DB enums; use CHECK constraints").

## Release checks

1. Confirm the new constraint definition:
   ```sql
   SELECT pg_get_constraintdef(oid)
     FROM pg_constraint
    WHERE conname = 'admin_auth_session_invalidated_reason_check';
   -- expected: CHECK (((invalidated_reason IS NULL)
   --                   OR (invalidated_reason = ANY (ARRAY[
   --                     'rotated'::text, 'manual_revoke'::text,
   --                     'cross_admin_revoked'::text, 'logout'::text,
   --                     'refresh_reuse_detected'::text,
   --                     'password_reset'::text,
   --                     'admin_deactivated'::text]))))
   ```
2. Confirm `_prisma_migrations` has exactly one row for
   `20260421110000_admin_auth_session_invalidated_reason_check` with
   `finished_at` set and no failed siblings.
3. Confirm the backfill ran:
   ```sql
   SELECT COUNT(*)
     FROM "admin_auth_sessions"
    WHERE "invalidated_reason" = 'fixture_force_logout_after_risk_review';
   -- expected: 0
   ```
4. Manual sanity (in a transaction you roll back):
   ```sql
   BEGIN;
   INSERT INTO "admin_auth_sessions" (
       "id", "admin_id", "session_family_id", "refresh_token_hash",
       "access_token_hash", "expires_at", "invalidated_reason"
   ) VALUES (
       gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), 'x', 'y',
       now() + interval '1 day', 'unknown_literal'
   );
   -- expected: ERROR: new row violates check constraint
   --                  "admin_auth_session_invalidated_reason_check"
   ROLLBACK;
   ```

## Recovery

If a target database ends up with a failed row for this migration:

```bash
DATABASE_URL=... \
  npx prisma migrate resolve \
    --rolled-back 20260421110000_admin_auth_session_invalidated_reason_check

DATABASE_URL=... npx prisma migrate deploy
```

Re-running is safe because the migration is fully transactional: a
failed run leaves the original column shape (no constraint) in place,
and the backfill `UPDATE`s are idempotent.
