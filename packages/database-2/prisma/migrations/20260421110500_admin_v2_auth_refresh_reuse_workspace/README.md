# Admin-v2 `auth_refresh_reuse` workspace allowlist expansion

Slice **MVP-3.5d** companion to
[`docs/admin-v2-mvp-3.5d-session-management-observability.md`](../../../../../docs/admin-v2-mvp-3.5d-session-management-observability.md).

## Purpose

Adds the workspace value `'auth_refresh_reuse'` to the existing CHECK
constraints `saved_view_workspace_check` and
`operational_alert_workspace_check`. After this migration both tables
accept rows with
`workspace IN ('ledger_anomalies', 'verification_queue', 'auth_refresh_reuse')`.
No table is created, no column is added, no index is touched, no data
is moved.

## Why now / phase

This is the second post-MVP-3 expansion slice (the first was
[`20260421101000_admin_v2_verification_queue_workspace`](../20260421101000_admin_v2_verification_queue_workspace/README.md)
delivered with MVP-3.4a). MVP-3 maturity track closed after 3.3b; the
saved-views and operational-alerts skeletons were intentionally shipped
with a **single-value** workspace allowlist so that each subsequent
workspace must arrive as an explicit, auditable migration plus
service-constant change. The
[saved-views foundation README](../20260421100000_admin_v2_saved_views_foundation/README.md)
explicitly documents this evolution rule under "Workspace allowlist
evolution" and lists the exact `ALTER ... DROP / ADD CONSTRAINT` shape
this migration uses.

The `auth_refresh_reuse` workspace is the second to take the upgrade
because admin session-management observability is the final Risk 13
mitigation step: the new operational-alert evaluator
`AuthRefreshReuseAlertEvaluator` reads `auth_audit_log` rows where
`event = 'refresh_reuse'` and fires when `count > threshold` over a
configurable `windowMinutes` payload, and operators need to be able to
create a row in `operational_alert` with this workspace value to wire
the cron-driven evaluation surface.

## Why a single migration extends two tables

`saved_view_workspace_check` and `operational_alert_workspace_check`
are conceptually one allowlist split across two physical tables. If
the migration were split in two:

- Either ordering can leave a window where one table accepts the new
  workspace value and the other rejects it. Any UI that creates an
  alert immediately after creating a view would observe an inconsistent
  allowlist.
- A failure of the second migration would leave the first applied,
  forcing a manual rollback of one constraint.

Both `ALTER TABLE` statements run inside the same transaction that
`prisma migrate deploy` opens for every migration. Either both
constraints are upgraded or neither is.

This slice does **not** ship a SavedView UI for `auth_refresh_reuse`
(see anti-scope in
[`docs/admin-v2-mvp-3.5d-session-management-observability.md`](../../../../../docs/admin-v2-mvp-3.5d-session-management-observability.md)
§"Out of scope"); the SavedView allowlist is extended in lockstep
purely to preserve the symmetry landed by 3.4a's
"a single migration extends two tables" decision. A future SavedView
slice can layer UI on top without another DB migration.

## Why no `IF EXISTS` / `IF NOT EXISTS`

`DROP CONSTRAINT IF EXISTS` and `ADD CONSTRAINT IF NOT EXISTS` would
silently no-op when the pre-migration shape is unexpected. That is
precisely the wrong behaviour for a constraint upgrade: if the
constraint is missing or already includes `'auth_refresh_reuse'`, the
deployment target has drifted from the assumed history (e.g. 3.3a, 3.3b
or 3.4a was skipped, or someone hand-edited the constraint), and we
want the deploy to fail loudly rather than declare a phantom success.

## Why no `CONCURRENTLY`

`ALTER TABLE ... DROP CONSTRAINT` and `ALTER TABLE ... ADD CONSTRAINT`
do not accept the `CONCURRENTLY` modifier. Even if they did,
`prisma migrate deploy` always wraps each migration in a single
transaction, and `CONCURRENTLY` cannot run inside a transaction.
Redefining a CHECK constraint takes an `ACCESS EXCLUSIVE` lock for
the duration of the validation; that validation re-checks every
existing row against the new predicate. Both tables are essentially
empty in production today (the skeleton landed in 3.3a/3.3b plus the
3.4a expansion), so the lock window is observationally instantaneous.

## Why DROP+ADD with the same name (not rename)

The alternative is to add a new constraint under a versioned name
(e.g. `saved_view_workspace_check_v3`) and then drop the old name in
the same transaction. That works, but it leaks a constraint-name
contract to any downstream tooling (monitoring, schema-diff, runbooks)
that filters on `pg_constraint.conname`. Keeping the same name keeps
the operator-facing contract stable.

Inside a transactional `prisma migrate deploy`, DROP+ADD same name has
zero observability window: outside the migration transaction nothing
ever sees the table without the constraint, and inside the transaction
no other session can read intermediate state. The atomic guarantee is
identical to the rename strategy without the rename's downstream cost.

## Application impact

Zero downtime expected:

- The lock is held for milliseconds because both tables are tiny.
- Existing rows already satisfy the new predicate (the new allowlist
  is a strict superset of the old one), so the constraint
  re-validation cannot find a violation.
- Application code (`OPERATIONAL_ALERT_WORKSPACES` in
  `apps/api-v2/src/admin-v2/operational-alerts/admin-v2-operational-alerts.dto.ts:5`,
  the new `AuthRefreshReuseAlertEvaluator`, the
  `WorkspaceEvaluatorRegistry` exhaustive registration, and the
  `system/alerts` form branch) is updated in lockstep in the same
  slice, so reads and writes using the new value become valid the
  moment both DB and code are deployed.

## Rollback plan

```sql
ALTER TABLE "saved_view"
DROP CONSTRAINT "saved_view_workspace_check";

ALTER TABLE "saved_view"
ADD CONSTRAINT "saved_view_workspace_check"
  CHECK ("workspace" IN ('ledger_anomalies', 'verification_queue'));

ALTER TABLE "operational_alert"
DROP CONSTRAINT "operational_alert_workspace_check";

ALTER TABLE "operational_alert"
ADD CONSTRAINT "operational_alert_workspace_check"
  CHECK ("workspace" IN ('ledger_anomalies', 'verification_queue'));
```

**Important**: the rollback fails if any row has already been written
with `workspace = 'auth_refresh_reuse'`. That is intentional: silently
discarding production rows would be a data-loss hazard. If a true
rollback is required after data has landed, the operator must first
hard-delete (or workspace-rewrite) the offending rows, then run the
rollback DDL above.

## Reassessment threshold

The `CHECK ("workspace" IN (...))` shape scales linearly with allowlist
size. Once the list reaches roughly five values, or whenever a
workspace's lifecycle stops mapping cleanly onto a free-form text value
(e.g. needing per-workspace metadata), reconsider:

- Move the allowlist into a lookup table
  (`workspace_catalog(id text PK, label text, ...)`) referenced via FK;
  or
- Promote the allowlist to a Postgres ENUM type, accepting the
  ENUM-evolution cost.

Until then, a CHECK constraint extension per slice remains the
cheapest-and-safest evolution path and is consistent with
[`.cursor/skills/migration-safety/SKILL.md`](../../../../../.cursor/skills/migration-safety/SKILL.md)
("avoid DB enums; use CHECK constraints").

## Release checks

1. Confirm the new constraint definitions on both tables:

   ```sql
   SELECT pg_get_constraintdef(oid)
     FROM pg_constraint
    WHERE conname = 'saved_view_workspace_check';
   -- expected: CHECK ((workspace = ANY (ARRAY[
   --     'ledger_anomalies'::text,
   --     'verification_queue'::text,
   --     'auth_refresh_reuse'::text])))

   SELECT pg_get_constraintdef(oid)
     FROM pg_constraint
    WHERE conname = 'operational_alert_workspace_check';
   -- expected: CHECK ((workspace = ANY (ARRAY[
   --     'ledger_anomalies'::text,
   --     'verification_queue'::text,
   --     'auth_refresh_reuse'::text])))
   ```

2. Confirm `_prisma_migrations` has exactly one row for
   `20260421110500_admin_v2_auth_refresh_reuse_workspace` with
   `finished_at` set and no failed siblings.
3. Manual sanity:

   ```sql
   -- accepted under the new allowlist
   INSERT INTO "operational_alert" ("owner_id", "workspace", "name",
                                     "query_payload", "threshold_payload")
   VALUES ('00000000-0000-0000-0000-000000000000', 'auth_refresh_reuse',
           'sanity', '{"windowMinutes":5}'::jsonb,
           '{"type":"count_gt","value":1}'::jsonb);
   -- (then DELETE the sanity row, or rely on the FK to admin to fail)

   -- still rejected
   INSERT INTO "operational_alert" ("owner_id", "workspace", "name",
                                     "query_payload", "threshold_payload")
   VALUES ('00000000-0000-0000-0000-000000000000', 'unknown_ws',
           'x', '{}'::jsonb, '{}'::jsonb);
   -- expected: ERROR: new row violates check constraint
   --                  "operational_alert_workspace_check"
   ```

## Recovery

If a target database ends up with a failed row for this migration:

```bash
DATABASE_URL=... \
  npx prisma migrate resolve \
    --rolled-back 20260421110500_admin_v2_auth_refresh_reuse_workspace

DATABASE_URL=... npx prisma migrate deploy
```

Re-running is safe because the migration is fully transactional: a
failed run leaves the original constraints in place, so the second
attempt sees exactly the same pre-migration state as the first.
