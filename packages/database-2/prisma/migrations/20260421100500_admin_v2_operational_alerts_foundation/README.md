# Admin-v2 operational alerts foundation

Slice **MVP-3.3b** companion to
[`docs/admin-v2-mvp-3.3b-operational-alerts-skeleton.md`](../../../../../docs/admin-v2-mvp-3.3b-operational-alerts-skeleton.md).

## Purpose

Introduces the `operational_alert` table that backs personal,
per-workspace operational alert definitions, evaluated by the new
`AdminV2OperationalAlertsEvaluatorService` `@Cron` scheduler. This is
the second (and last) half of the remaining MVP-3 exit criterion. After
this slice lands, the MVP-3 maturity track is closed.

## Why now / phase

- MVP-3 exit criteria require both saved views and operational alerts.
  Saved views landed in slice 3.3a; this slice ships the alert half on
  the same `'ledger_anomalies'` workspace, reusing the opaque payload
  contract introduced there for the alert's `query_payload` column and
  layering a structured `threshold_payload` column on top for evaluator
  semantics.
- All other admin-v2 clusters (anomalies 3.1a/b/c, assignments 3.2a,
  saved views 3.3a, verification, overview, system) are frozen by this
  slice except for one blessed read-only addition documented in the
  reconciliation note (`AdminV2LedgerAnomaliesService.getCount`).

## What this migration actually does

Creates a single new table `operational_alert` with:

- columns
  `(id, owner_id, workspace, name, description, query_payload,
threshold_payload, evaluation_interval_minutes,
last_evaluated_at, last_evaluation_error,
last_fired_at, last_fire_reason,
created_at, updated_at, deleted_at)`
- a primary key on `id`
- a `CHECK` constraint `operational_alert_workspace_check`
  restricting `workspace` to the allowlist `('ledger_anomalies')`
- a `CHECK` constraint `operational_alert_name_length_check`
  (1-100 chars)
- a `CHECK` constraint `operational_alert_description_length_check`
  (`description` is `NULL` or `<=500` chars)
- a `CHECK` constraint `operational_alert_query_payload_size_check`
  (`octet_length(query_payload::text) <= 4096`)
- a `CHECK` constraint `operational_alert_threshold_payload_size_check`
  (`octet_length(threshold_payload::text) <= 1024`)
- a `CHECK` constraint `operational_alert_evaluation_interval_check`
  (`evaluation_interval_minutes BETWEEN 1 AND 1440`)
- a `CHECK` constraint
  `operational_alert_last_fire_reason_length_check`
  (`last_fire_reason` is `NULL` or `<=500` chars)
- a `CHECK` constraint
  `operational_alert_last_evaluation_error_length_check`
  (`last_evaluation_error` is `NULL` or `<=500` chars)
- a foreign key `owner_id` -> `admin(id)` with `ON DELETE NO ACTION`
- a composite index `(owner_id, workspace, deleted_at)` to support the
  list endpoint shape `WHERE owner_id = $1 AND workspace = $2 AND
deleted_at IS NULL`
- a composite index `(deleted_at, last_evaluated_at)` to support the
  evaluator selection query
  `WHERE deleted_at IS NULL ORDER BY last_evaluated_at NULLS FIRST
LIMIT N`
- a partial unique index
  `(owner_id, workspace, name) WHERE deleted_at IS NULL` to allow name
  reuse after soft-delete while preventing duplicates among active rows

The table is created empty; no backfill, no triggers, no materialised
views, no sequences beyond the implicit ones.

## Why not `CREATE INDEX CONCURRENTLY`

`prisma migrate deploy` always wraps each migration in a single
transaction, and `CONCURRENTLY` cannot run inside a transaction.
Switching to `CONCURRENTLY` would require an out-of-band predeploy
runner step that does not exist in CI or the release runbook. The
table is created empty by this migration, so the index builds are
instantaneous regardless.

## Why two payload columns and not one merged payload

- `query_payload` is **opaque** to the backend (object/array/null +
  size cap, no structural parsing). It identifies "what to observe"
  (workspace-specific filter combination) and stays opaque so the
  shared service is not coupled to per-workspace filter shapes —
  identical contract to `saved_view.query_payload`.
- `threshold_payload` is **structured**: the backend must parse it
  because the evaluator must execute the threshold comparison. A
  merged single-payload would force one of two anti-patterns: either
  the backend parses the whole payload (loses the opaque-from-backend
  invariant for query-region) or threshold lives nested inside the
  opaque region and the evaluator silently parses a sub-tree (less
  explicit boundary).
- Splitting columns makes the boundary explicit at the schema level:
  query = opaque region, threshold = structured region. Future
  expansions (e.g. adding `aggregation_payload` for `z_score`) are
  additive in the same style.

## Why JSONB and not JSON

- Shape uniformity with `saved_view.query_payload` (also `JSONB`).
- `JSONB` allows future indexing (e.g. expression indexes on payload
  fields once a per-workspace schema discipline is established).
- The 4 KB / 1 KB CHECK constraints keep storage firmly inside
  Postgres' inline-without-TOAST window.

## Why `threshold_payload` size limit 1 KB and not 4 KB

The threshold shape is restricted to a small enumerated set of
supported types in the roadmap (in this skeleton: `count_gt` only;
follow-ups: `rate_change`, `z_score`, `percentile_above`,
`compare_to_baseline`). Each type fits comfortably in tens of bytes;
1 KB is a 100x headroom guard against accidental/abusive payload
growth without giving up storage cost.

## Why `evaluation_interval_minutes` default 5 and bounded 1-1440

- Lower bound 1 minute prevents DB load attacks (an alert configured
  at `0` would have `last_evaluated_at <= NOW() - 0 INTERVAL` always
  true; the evaluator would re-pick the same alert every tick).
- Upper bound 1440 (24 hours) prevents "false sense of monitoring":
  intervals longer than a day stop being operationally useful as
  alerts and start behaving like batch reports — those belong to a
  separate slice with different UX.
- Default 5 matches the `@Cron` interval of the evaluator
  (`'*/5 * * * *'`), giving a "tick-aligned" default that maps the
  least surprising cadence to operators.

## Why a `CHECK` constraint and not a Postgres `ENUM` type

Per the project's
[`.cursor/skills/migration-safety/SKILL.md`](../../../../../.cursor/skills/migration-safety/SKILL.md)
("avoid DB enums; use CHECK constraints"). Mirrors the precedent from
`saved_view_workspace_check` in
`20260421100000_admin_v2_saved_views_foundation/migration.sql:13-16`.

## Workspace allowlist evolution

`operational_alert_workspace_check` currently allows only
`'ledger_anomalies'`. Each future workspace expansion (e.g.
`'payments'`, `'verification'`) must ship as its own additive
migration:

```sql
ALTER TABLE "operational_alert" DROP CONSTRAINT
  "operational_alert_workspace_check";
ALTER TABLE "operational_alert"
  ADD CONSTRAINT "operational_alert_workspace_check"
  CHECK ("workspace" IN ('ledger_anomalies', '<new_workspace>'));
```

This is intentional friction: enabling a new workspace is an explicit
architectural decision (DB constraint + service constant + new
`OperationalAlertWorkspaceEvaluator` strategy implementation +
frontend integration + tests), not a silent code change. The
service-level `OPERATIONAL_ALERT_WORKSPACES` constant **and** the
strategy registry in `AdminV2OperationalAlertsEvaluatorService` must
be expanded in lockstep.

## Why no occurrence model in this migration

`last_fired_at` / `last_fire_reason` row-level snapshot fields
answer the immediate operational question "is this alert currently
firing?" — that is sufficient for the in-app fired-state badge.

A full `OperationalAlertOccurrenceModel` (history of all firings)
would be a high-cardinality time series requiring a partition
strategy, retention policy, cleanup scheduler, and pagination on a
new read endpoint. Each of those decisions deserves its own evidence;
deferred to a follow-up slice. Reassessment trigger: the first
operator request "show me the fire history for this alert".

## Why no `version` integer column

Soft-delete plus the `expectedDeletedAtNull` proxy (sent by the client
in update / delete bodies) is sufficient for a skeleton. This mirrors
the decision documented in slices 3.2a (operational assignments) and
3.3a (saved views). Adding an integer `version` would commit us to
bumping it on every `UPDATE` (including evaluator-driven
`last_evaluated_at` / `last_fired_at` writes) and would either pollute
admin-driven version semantics with system-driven row updates or
force two version columns. Both are over-budget for the skeleton.

## Why partial unique index instead of full unique

Full unique on `(owner_id, workspace, name)` would prevent reusing a
name after soft-delete, forcing operators into auto-suffixing or
never recreating familiar names. The partial variant
`WHERE deleted_at IS NULL` keeps active-row uniqueness while letting
`name` be reclaimed after a delete. Mirrors
`idx_saved_view_active_owner_workspace_name` in
`20260421100000_admin_v2_saved_views_foundation/migration.sql:32-34`.

## Why a second composite index on `(deleted_at, last_evaluated_at)`

The evaluator's selection query is
`WHERE deleted_at IS NULL AND (last_evaluated_at IS NULL OR
last_evaluated_at <= NOW() - <interval>) ORDER BY last_evaluated_at
NULLS FIRST, id ASC LIMIT N`.

Leading `deleted_at` lets the planner restrict to active rows
cheaply; the trailing `last_evaluated_at` supports the ordered
range scan with `NULLS FIRST`. The list-endpoint composite index
`(owner_id, workspace, deleted_at)` does not help this query because
the evaluator scans across all owners.

## Reassessment threshold

If/when `operational_alert` grows large enough that schema changes or
evaluator scans start to hurt — practical guard rails:

- `pg_total_relation_size('public.operational_alert')` > ~10 MB, or
- `pg_class.reltuples` for `operational_alert` > ~50 000, or
- evaluator p95 tick latency > 60s on production workload

then a follow-up to introduce occurrence partitioning, an
`OperationalAlertOccurrenceModel`, hard-delete (e.g. for GDPR
right-to-be-forgotten on admin accounts), or a multi-instance pull-
with-lock evaluator pattern should be opened. Until then, soft-delete

- 4 KB query payload cap + 1 KB threshold payload cap + bounded
  single-instance evaluator keep operational cost negligible.

## Rollback plan

```sql
DROP TABLE "operational_alert";
```

Safe because no other table references `operational_alert` (FKs flow
inward from `admin`, not outward). Audit log entries for
`alert_create` / `alert_update` / `alert_delete` would be left as
references to a no-longer-resolvable id; that is acceptable for a
rollback scenario (audit log is append-only by design).

## Release checks

1. Confirm `operational_alert` table exists with the eight CHECK
   constraints, the FK to `admin(id)`, and the three indexes (two
   non-unique + one partial unique) — `\d+ operational_alert` in
   `psql`.
2. Confirm `_prisma_migrations` has a single row for
   `20260421100500_admin_v2_operational_alerts_foundation` with
   `finished_at` set.
3. Manual sanity:

   ```sql
   INSERT INTO "operational_alert"
     ("owner_id", "workspace", "name", "query_payload",
      "threshold_payload")
   VALUES ('00000000-0000-0000-0000-000000000000', 'unknown_ws',
           'x', '{}'::jsonb, '{"type":"count_gt","value":1}'::jsonb);
   -- expected: ERROR: new row violates check constraint
   --                  "operational_alert_workspace_check"

   INSERT INTO "operational_alert"
     ("owner_id", "workspace", "name", "query_payload",
      "threshold_payload", "evaluation_interval_minutes")
   VALUES ('00000000-0000-0000-0000-000000000000', 'ledger_anomalies',
           'x', '{}'::jsonb, '{"type":"count_gt","value":1}'::jsonb, 0);
   -- expected: ERROR: new row violates check constraint
   --                  "operational_alert_evaluation_interval_check"
   ```
