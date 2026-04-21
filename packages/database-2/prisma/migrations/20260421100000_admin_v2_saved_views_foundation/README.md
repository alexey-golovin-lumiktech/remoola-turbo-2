# Admin-v2 saved views foundation

Slice **MVP-3.3a** companion to
[`docs/admin-v2-mvp-3.3a-saved-views-skeleton.md`](../../../../../docs/admin-v2-mvp-3.3a-saved-views-skeleton.md).

## Purpose

Introduces the `saved_view` table that backs personal, per-workspace saved
filter combinations. This is the first half of the remaining MVP-3 exit
criterion ("saved views and operational alerts configurable" — see
`admin-v2-pack/08-rollout-risks-and-sequencing.md` §"MVP-3"). Operational
alerts are deferred to slice 3.3b and will reuse the same opaque payload
contract introduced here.

## Why now / phase

- MVP-3 exit criteria require both saved views and operational alerts.
  Saved views land first because they have no cross-table dependency and
  unlock immediate operator value on the ledger anomalies queue.
- Anomaly cluster (3.1a/b/c) and assignment cluster (3.2a) are frozen by
  this slice; this migration introduces a new, isolated table only.

## What this migration actually does

Creates a single new table `saved_view` with:

- `(id, owner_id, workspace, name, description, query_payload,
created_at, updated_at, deleted_at)`
- a primary key on `id`
- a `CHECK` constraint `saved_view_workspace_check` restricting
  `workspace` to the allowlist `('ledger_anomalies')`
- a `CHECK` constraint `saved_view_name_length_check` (1-100 chars)
- a `CHECK` constraint `saved_view_description_length_check` (<=500 chars)
- a `CHECK` constraint `saved_view_query_payload_size_check`
  (`octet_length(query_payload::text) <= 4096`)
- a foreign key `owner_id` -> `admin(id)` with `ON DELETE NO ACTION`
- a composite index `(owner_id, workspace, deleted_at)` to support the
  list endpoint shape `WHERE owner_id = $1 AND workspace = $2 AND
deleted_at IS NULL`
- a partial unique index `(owner_id, workspace, name) WHERE deleted_at
IS NULL` to allow name reuse after soft-delete while preventing
  duplicates among active rows

The table is created empty; no backfill, no triggers, no materialised
views, no sequences beyond the implicit ones.

## Why JSONB and not JSON

- `JSONB` allows future indexing (e.g. expression indexes on payload
  fields once schema discipline is established per workspace).
- The 4 KB CHECK constraint puts the parsing/storage cost firmly inside
  Postgres' inline-without-TOAST window.

## Why a `CHECK` constraint and not a Postgres `ENUM` type

Per the project's
[`.cursor/skills/migration-safety/SKILL.md`](../../../../../.cursor/skills/migration-safety/SKILL.md)
("avoid DB enums; use CHECK constraints"). Mirrors the precedent from
`operational_assignment_resource_type_check` in
`20260417223000_operational_assignment_foundation/migration.sql`.

## Workspace allowlist evolution

`saved_view_workspace_check` currently allows only `'ledger_anomalies'`.
Each future workspace expansion (e.g. `'payments'`, `'verification'`)
must ship as its own additive migration:

```sql
ALTER TABLE "saved_view" DROP CONSTRAINT "saved_view_workspace_check";
ALTER TABLE "saved_view"
  ADD CONSTRAINT "saved_view_workspace_check"
  CHECK ("workspace" IN ('ledger_anomalies', '<new_workspace>'));
```

This is intentional friction: enabling a new workspace is an explicit
architectural decision (DB constraint + service constant + frontend
integration + tests), not a silent code change. The service-level
`SAVED_VIEW_WORKSPACES` constant must be expanded in lockstep.

## Why no `version` integer column

Soft-delete plus the `expectedDeletedAtNull` proxy (sent by the client
in update / delete bodies) is sufficient for a skeleton. This mirrors
the decision documented in slice 3.2a (operational assignments) — see
[`docs/admin-v2-mvp-3.2a-operational-assignments.md`](../../../../../docs/admin-v2-mvp-3.2a-operational-assignments.md)
§"Decision: version proxy". Adding an integer `version` would commit
us to bumping it on every `UPDATE` and is over-budget for the skeleton.

## Why partial unique index instead of full unique

Full unique on `(owner_id, workspace, name)` would prevent reusing a
name after soft-delete, forcing operators into auto-suffixing or never
recreating familiar names. The partial variant `WHERE deleted_at IS
NULL` keeps active-row uniqueness while letting `name` be reclaimed
after a delete. This mirrors `idx_operational_assignment_active_resource`
in `20260417223000_operational_assignment_foundation/migration.sql:48-50`.

## Why not `CREATE INDEX CONCURRENTLY`

`prisma migrate deploy` always wraps each migration in a single
transaction, and `CONCURRENTLY` cannot run inside a transaction.
Switching to `CONCURRENTLY` would require an out-of-band predeploy
runner step that does not exist in CI or the release runbook. The
table is created empty by this migration, so the index builds are
instantaneous regardless.

## Reassessment threshold

If/when `saved_view` grows large enough that schema changes start to
hurt — practical guard rails:

- `pg_total_relation_size('public.saved_view')` > ~10 MB, or
- `pg_class.reltuples` for `saved_view` > ~100 000

then a follow-up to introduce a hard-delete scrubber (e.g. for GDPR
right-to-be-forgotten on admin accounts) or a `version` integer column
should be opened. Until then, soft-delete + 4 KB payload cap keeps
storage cost negligible.

## Rollback plan

```sql
DROP TABLE "saved_view";
```

Safe because no other table references `saved_view` (FKs flow inward
from `admin`, not outward). Audit log entries for
`saved_view_create` / `saved_view_update` / `saved_view_delete` would
be left as references to a no-longer-resolvable id; that is acceptable
for a rollback scenario (audit log is append-only by design).

## Release checks

1. Confirm `saved_view` table exists with the four CHECK constraints
   and the partial unique index (`\d+ saved_view` in `psql`).
2. Confirm `_prisma_migrations` has a single row for
   `20260421100000_admin_v2_saved_views_foundation` with `finished_at`
   set.
3. Manual sanity:
   ```sql
   INSERT INTO "saved_view" ("owner_id", "workspace", "name",
                             "query_payload")
   VALUES ('00000000-0000-0000-0000-000000000000', 'unknown_ws',
           'x', '{}'::jsonb);
   -- expected: ERROR: new row violates check constraint
   --                  "saved_view_workspace_check"
   ```
