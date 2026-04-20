# Admin-v2 anomalies outcome indexes

Slice **MVP-3.1b** companion to
[`20260420163000_admin_v2_ledger_anomalies_indexes/README.md`](../20260420163000_admin_v2_ledger_anomalies_indexes/README.md).

## Changes

- adds `ledger_entry_outcome (ledger_entry_id, created_at DESC, id DESC)
INCLUDE (status)` as
  `idx_ledger_entry_outcome_lateral_covering`

That single composite covering index is enough to close both gaps
identified by the 3.1a audit on the LATERAL join used by every anomaly
class:

1. the `ORDER BY o.created_at DESC, o.id DESC LIMIT 1` tie-break can now
   be served from the index without an extra `Incremental Sort` step;
2. `status` is in the `INCLUDE` clause, so the LATERAL becomes a true
   `Index Only Scan` (`Heap Fetches: 0`) rather than an `Index Scan`
   that touches the heap to project status.

The pre-existing `idx_ledger_entry_outcome_ledger_entry_id_created_at`
from migration `20260225140000_ledger_entry_outcome_append_only` is left
in place. This migration is **additive-only** — drop of the older index
is owned by a future cleanup once we have a measurement window that
confirms the planner has fully migrated to the covering one (see
"Reassessment threshold" below).

## What this migration actually does

It runs one plain `CREATE INDEX IF NOT EXISTS` statement inside the
transaction that `prisma migrate deploy` opens for every migration. That
means it takes an `ACCESS EXCLUSIVE` lock on `ledger_entry_outcome` for
the duration of the index build.

This is accepted, not because we have a zero-downtime fallback, but
because at the time of writing `ledger_entry_outcome` is small enough
that the lock window is not observable on the production target:

- inspected production target (Neon, PG 17.8): table is empty / single
  page; `pg_total_relation_size('ledger_entry_outcome')` measured in
  kilobytes (no separate row count taken — see appendix in
  [3.1a README](../20260420163000_admin_v2_ledger_anomalies_indexes/README.md));
- inspected local dev target (PG 18.3) before perf seeding: 0 live
  rows;
- on the 50k-entry / ~123k-outcome synthetic dataset used by
  [`scripts/admin-v2-anomalies-perf/`](../../../../../scripts/admin-v2-anomalies-perf/README.md),
  this migration completed in well under one second.

## Why not `CREATE INDEX CONCURRENTLY`

Same reason as in the 3.1a migration:
`CREATE INDEX CONCURRENTLY` cannot run inside a transaction block, and
`prisma migrate deploy` always wraps each migration in a transaction.
Switching to a `CONCURRENTLY` rollout requires a predeploy runner step
that does not currently exist in CI or in the release runbook (see
"Predeploy folder decision" in the
[3.1a README](../20260420163000_admin_v2_ledger_anomalies_indexes/README.md#predeploy-folder-decision)).

## Reassessment threshold

Before adding any further index to `ledger_entry_outcome` — or before
dropping the older `idx_ledger_entry_outcome_ledger_entry_id_created_at`
in favour of the covering one introduced here — re-check size on the
live target. If either becomes true:

- `pg_total_relation_size('public.ledger_entry_outcome')` > ~10 MB, or
- `pg_class.reltuples` for `ledger_entry_outcome` > ~100 000

then the next index change on this table must ship as an out-of-band
predeploy step, not through `prisma migrate deploy`. The shape of that
step is the same template documented in the 3.1a README appendix.

## Schema declaration

The new index is intentionally **not** declared in `schema.prisma` via
`@@index`, mirroring the deliberate drift accepted in 3.1a. Reasons:

- if/when we move to a `CONCURRENTLY` rollout, Prisma must not try to
  recreate this index inside its own transactional path;
- `INCLUDE (status)` covering indexes are not first-class in Prisma's
  `@@index` directive at the version pinned by this repo (Prisma
  `6.19.0`), so declaring it would either fail or be silently rewritten
  to a non-covering shape.

## Planner expectations

After this migration, on the synthetic 50k / ~123k-outcome dataset:

- the LATERAL `ORDER BY o.created_at DESC, o.id DESC LIMIT 1` lookup is
  served by `Index Only Scan using idx_ledger_entry_outcome_lateral_covering`
  with `Heap Fetches: 0`;
- the previous `Incremental Sort` step disappears entirely;
- per-loop cost on the LATERAL drops by roughly 25% in shared buffer
  hits (200k → 150k for the count probes).

Full BEFORE/AFTER measurements (p50/p95/p99 + EXPLAIN excerpts) live in
[`docs/admin-v2-mvp-3.1b-perf-evidence.md`](../../../../../docs/admin-v2-mvp-3.1b-perf-evidence.md).

## Storage cost

Measured on the synthetic dataset (~123k `ledger_entry_outcome` rows):

- `idx_ledger_entry_outcome_lateral_covering` ≈ **8.2 MB**
- existing `idx_ledger_entry_outcome_ledger_entry_id_created_at`
  ≈ 5.5 MB (kept additive)

The covering index is larger because it materialises `id` and `status`
alongside `(ledger_entry_id, created_at)`. This is a deliberate trade
of disk footprint for an index-only scan on every anomaly probe.

## Release checks

1. Confirm `idx_ledger_entry_outcome_lateral_covering` exists on
   `ledger_entry_outcome` and is valid.
2. Confirm `_prisma_migrations` has a single row for
   `20260420170000_admin_v2_anomalies_outcome_indexes` with
   `finished_at` set and no failed siblings.
3. After the first measurement window in production (Datadog / Vercel
   logs), confirm the LATERAL plan picks
   `idx_ledger_entry_outcome_lateral_covering` and not
   `idx_ledger_entry_outcome_ledger_entry_id_created_at`. If the planner
   still prefers the older index after stats are warm, do not drop it
   in this slice — open a follow-up.
4. Treat rollback as forward-fix; do not replace the new index with a
   blocking variant during rollout.

## Recovery

If a target database ends up with a failed row for this migration
(started_at set, finished_at NULL), the recovery is the same shape as
for 3.1a:

```bash
DATABASE_URL=... \
  npx prisma migrate resolve \
    --rolled-back 20260420170000_admin_v2_anomalies_outcome_indexes

DATABASE_URL=... npx prisma migrate deploy
```

This is safe because `CREATE INDEX IF NOT EXISTS` is idempotent —
re-running the statement after a partial failure either creates the
index or no-ops if it already exists.
