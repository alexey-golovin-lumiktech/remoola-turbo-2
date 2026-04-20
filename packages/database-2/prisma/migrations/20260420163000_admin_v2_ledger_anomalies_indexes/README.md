# Admin-v2 ledger anomalies indexes

This migration is additive-only.

## Changes

- adds `ledger_entry(type, status)` to support anomaly summary and class-filtered list probes
- adds `ledger_entry(status, created_at)` to support stale pending scans and bounded operator windows

## What this migration actually does

It runs two plain `CREATE INDEX IF NOT EXISTS` statements inside the
transaction that `prisma migrate deploy` opens for every migration. That means
each statement takes an `ACCESS EXCLUSIVE` lock on `ledger_entry` for the
duration of the index build.

This is accepted today, not because we have a zero-downtime fallback, but
because at the time of writing `ledger_entry` is small enough that the lock
window is not observable:

- inspected production target (Neon, PG 17.8): `pg_total_relation_size('ledger_entry')` ~ 136 kB, `relpages = 1`, ~33 live rows
- inspected local dev target (PG 18.3): `relpages = 0`, 0 live rows

At that scale `CREATE INDEX` returns in milliseconds and the lock is invisible
to traffic. We do not pretend to do this concurrently, because there is no
predeploy step in the repo that would actually run `CREATE INDEX CONCURRENTLY`
before `prisma migrate deploy` — neither in CI nor in the release runbook.

## Why not `CREATE INDEX CONCURRENTLY`

`CREATE INDEX CONCURRENTLY` cannot run inside a transaction block, and
`prisma migrate deploy` always wraps each migration in a transaction. The
first version of this migration used `CONCURRENTLY` and failed with
SQLSTATE 25001 (`CREATE INDEX CONCURRENTLY cannot run inside a transaction
block`), which then blocked all subsequent deploys until the failed row was
resolved via `prisma migrate resolve --rolled-back`. Removing `CONCURRENTLY`
is the only way to keep this migration runnable through standard
`prisma migrate deploy`.

## Reassessment threshold

Before adding any further index to `ledger_entry`, re-check size on the live
target. If either of the following becomes true:

- `pg_total_relation_size('public.ledger_entry')` > ~10 MB, or
- `pg_class.reltuples` for `ledger_entry` > ~100 000

then the next index on this table must be created out of band, not through
`prisma migrate deploy`. The shape of that out-of-band step is documented in
the appendix below as a future template; it is not part of any current
release pipeline.

## Schema declaration

The indexes are intentionally not declared in `schema.prisma` via `@@index`
so that, if and when we move to a `CONCURRENTLY` rollout, Prisma does not try
to recreate them inside its own transactional path. Schema drift is accepted
here as a deliberate trade-off.

## Planner expectations on current data

At the inspected sizes the planner picks `Seq Scan` for both anomaly probe
shapes — `WHERE status = 'PENDING' AND created_at < ...` and
`WHERE type IN (...) AND status = ...` — because a single page is cheaper
than any index lookup. This is expected. These indexes are added against
future volume, not against current planner cost.

If you observe anomaly probes still seq-scanning after meaningful growth,
run `ANALYZE public.ledger_entry;` first — at the time of writing
`pg_stats.n_distinct` for `type` was reported as `1`, which means the
planner's selectivity estimates lag the actual distribution and should be
refreshed before drawing conclusions.

## Findings from query analysis (post-deploy)

A read of the actual admin-v2 read-paths against `ledger_entry` showed that
the original "anomaly summary / list" justification for the index pair does
not match how the current code actually queries the table. Recording the
findings here so the next person on this surface does not have to repeat
the analysis.

Files inspected:

- `apps/api-v2/src/admin-v2/ledger/anomalies/admin-v2-ledger-anomalies.service.ts`
- `apps/api-v2/src/admin-v2/ledger/admin-v2-ledger.service.ts`
- `apps/api-v2/src/admin-v2/system/admin-v2-system.service.ts`
- `apps/api-v2/src/admin-v2/overview/admin-v2-overview.service.ts`

### `ledger_entry_type_status_idx` (`(type, status)`)

Effective usage: leading column `type` only.

- `admin-v2-ledger.service.ts:getList` filters optionally by `le.type::text = ?`.
- `admin-v2-system.service.ts:getStripeCheckoutLag` filters by `entry.type::text = 'USER_PAYMENT'`.
- `admin-v2-system.service.ts:getStripeReversalLag` filters by `entry.type::text IN (...)`.

In all three places the status condition is written as
`COALESCE(latest.status, entry.status) = ?`, which wraps the column in a
function and prevents the planner from using the second column of the index.
Net effect: the trailing `status` column never participates in matching;
the index works as if it were `(type)` and pays the storage cost of `(type, status)`.

Not a regression. Worth noting if a future migration considers reshaping
this into `(type)` or `(type, created_at DESC)` (sort-friendly for the
`ORDER BY le.created_at DESC` cursor in `getList`).

### `ledger_entry_status_created_at_idx` (`(status, created_at)`)

Effective usage today: none.

The anomaly probes the README originally cited (`stalePendingEntries`,
`inconsistentOutcomeChains`, `largeValueOutliers`) all derive `status`
from the latest `ledger_entry_outcome` row via a LATERAL join, not from
`ledger_entry.status` directly:

- `stalePendingEntries` — `WHERE latest.status IN (...) AND latest.created_at < cutoff`
- `inconsistentOutcomeChains` — `WHERE le.status <> latest.status` (inequality, not indexable)
- `largeValueOutliers` — no filter on `le.status` at all

The `getList` and Stripe lag queries use `COALESCE(latest.status, le.status)`,
which also bypasses an index on `le.status`.

This index is therefore dormant against the current codebase. It is left in
place because:

- the schema model (AGENTS 6.10) makes `le.status` a trigger-synced mirror of
  the latest outcome, so any new probe written without the LATERAL pattern
  (i.e. reading `le.status` directly) will benefit;
- on current sizes (1 page on local, 1 page on Neon) the storage cost is
  effectively zero.

If by the next reassessment threshold no read-path filters on `le.status`
directly, dropping this index in a follow-up migration is fair game.

## Predeploy folder decision

Considered but not introduced in this slice: a `packages/database-2/prisma/predeploy/`
directory for SQL files that must run outside `prisma migrate deploy`'s
transaction (e.g. `CREATE INDEX CONCURRENTLY`).

Decision: do not introduce yet.

Rationale:

- there is currently zero traffic that would be hurt by a transactional
  `CREATE INDEX` on `ledger_entry` (volumes documented above);
- introducing the folder is not cheap — it requires a runner step in CI and
  in the release runbook, plus a rule for how the corresponding Prisma
  migration records the already-existing index (typically a no-op
  `CREATE INDEX IF NOT EXISTS` followed by `prisma migrate resolve --applied`,
  or a generated marker migration);
- without that runner step the folder is documentation, not enforcement,
  and we already have one piece of fictional documentation in this surface
  (the prior README) that this slice is removing — adding another would be
  the same shape of mistake.

Trigger for revisiting: the same threshold as for the next index on
`ledger_entry` (`pg_total_relation_size` > ~10 MB or `reltuples` > ~100k),
or any other table that grows past comparable size and needs an index added
post-launch. At that point the predeploy runner becomes worth its weight,
because the alternative is taking a real lock on a non-trivial table.

## Release checks

1. Confirm both `ledger_entry_type_status_idx` and `ledger_entry_status_created_at_idx` exist on `ledger_entry` and are valid.
2. Confirm `_prisma_migrations` has a single row for `20260420163000_admin_v2_ledger_anomalies_indexes` with `finished_at` set and no failed siblings.
3. Treat rollback as forward-fix; do not replace these indexes with blocking variants during rollout.

## Recovery from the original failed deploy

If a target database still has a failed row for this migration (started_at
set, finished_at NULL, rolled_back_at NULL, log mentions
`CREATE INDEX CONCURRENTLY cannot run inside a transaction block`), the
recovery is:

```bash
DATABASE_URL=... \
  npx prisma migrate resolve \
    --rolled-back 20260420163000_admin_v2_ledger_anomalies_indexes

DATABASE_URL=... npx prisma migrate deploy
```

This is safe because the failed attempt has `applied_steps_count = 0` and
neither index was physically created — there is nothing to undo in the
schema.

## Appendix: future template for non-trivial `ledger_entry` indexes

When the reassessment threshold above is reached, a future index on
`ledger_entry` should ship as an out-of-band predeploy step (not through
`prisma migrate deploy`), e.g.:

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ledger_entry_<name>_idx"
  ON "ledger_entry" (...);
```

Adopting this template requires (a) a place in the release pipeline that runs
SQL outside any transaction and (b) a follow-up Prisma migration that records
the index in migration history (e.g. via `prisma migrate resolve --applied`
or a no-op `IF NOT EXISTS` re-statement). Neither piece exists today, which
is why this current migration does not use it.
