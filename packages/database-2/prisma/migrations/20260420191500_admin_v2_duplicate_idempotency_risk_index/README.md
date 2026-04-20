# Admin-v2 duplicate idempotency risk index

Slice **MVP-3.1c** additive migration for the read-only ledger anomalies
surface.

## Changes

- adds partial index `idx_ledger_entry_duplicate_idempotency_risk`
- key shape: `ledger_entry(created_at DESC, id DESC)`
- predicate:
  - `deleted_at IS NULL`
  - `idempotency_key IS NULL`
  - `stripe_id IS NOT NULL`

The shape matches `duplicateIdempotencyRisk` exactly:

- count probes filter the partial set by a bounded `created_at` window
- list probes use the same filter and order by `created_at DESC, id DESC`

## Why this migration exists

This is **future-proofing, not a p95 rescue**.

On the synthetic 50k dataset used by
[`scripts/admin-v2-anomalies-perf/`](../../../../../scripts/admin-v2-anomalies-perf/README.md),
the pre-migration duplicate-risk probes were already cheap:

- `countDuplicateIdempotencyRisk` p95: **8.5 ms**
- `listDuplicateIdempotencyRisk` p95: **7.7 ms**

That is why the index was approved as future-proofing rather than as a p95
budget rescue. After the migration, the same post-migration measurement shows
that the planner already flips to the new partial index even on the synthetic
dataset:

- `countDuplicateIdempotencyRisk` p95: **1.04 ms**
- `listDuplicateIdempotencyRisk` p95: **1.90 ms**
- `countDuplicateIdempotencyRisk`: `Index Only Scan using idx_ledger_entry_duplicate_idempotency_risk`
- `listDuplicateIdempotencyRisk`: `Index Scan using idx_ledger_entry_duplicate_idempotency_risk`

The important point for rollout remains the same: the slice does not need this
index to stay under the current summary endpoint budget, but it is now present
before production growth can make the shape expensive.

## What this migration actually does

It runs one plain `CREATE INDEX IF NOT EXISTS` statement inside the transaction
that `prisma migrate deploy` opens for every migration. That means it takes an
`ACCESS EXCLUSIVE` lock on `ledger_entry` for the duration of the index build.

This is accepted today because `ledger_entry` is still small enough that the
lock window is not observable on the current targets:

- prior inspected production target for the anomaly index work showed
  `ledger_entry` at ~136 kB / ~33 live rows;
- on the local synthetic 50k dataset, the index build completes comfortably
  within a local developer workflow window.

## Why not `CREATE INDEX CONCURRENTLY`

`CREATE INDEX CONCURRENTLY` cannot run inside a transaction block, and
`prisma migrate deploy` always wraps each migration in a transaction.

This repo does not have a predeploy SQL runner for out-of-band index builds.
Until that exists, additive transactional `CREATE INDEX IF NOT EXISTS` is the
only migration shape that is both real and deployable through the current
release path.

## Planner expectations

Observed planner behaviour after this migration on the 50k synthetic dataset:

- `countDuplicateIdempotencyRisk` uses an `Index Only Scan` on
  `idx_ledger_entry_duplicate_idempotency_risk`
- `listDuplicateIdempotencyRisk` uses an `Index Scan` on
  `idx_ledger_entry_duplicate_idempotency_risk`
- higher-volume production growth already has the exact predicate + cursor-order
  index in place, so no follow-up schema change is needed for the same class

This remains deliberate. The slice justification was "future-proofing first";
the fact that the planner already uses the index on the synthetic baseline is a
welcome upside, not a precondition for merge.

## Schema declaration

The index is intentionally **not** declared in `schema.prisma` via `@@index`.
Reasons:

- the repo already accepts deliberate schema drift for operational indexes on
  this surface;
- if a future rollout needs `CONCURRENTLY`, Prisma must not try to recreate the
  same index inside its transactional path;
- the partial predicate is part of the operational contract and is clearer in
  explicit SQL than in a drifting schema declaration.

## Reassessment threshold

Before adding any further index to `ledger_entry`, re-check size on the live
target. If either becomes true:

- `pg_total_relation_size('public.ledger_entry')` > ~10 MB, or
- `pg_class.reltuples` for `ledger_entry` > ~100 000

then the next index on this table must be reconsidered as an out-of-band
predeploy step rather than another transactional Prisma migration.

## Release checks

1. Confirm `idx_ledger_entry_duplicate_idempotency_risk` exists on
   `ledger_entry` and is valid.
2. Confirm `_prisma_migrations` has a single row for
   `20260420191500_admin_v2_duplicate_idempotency_risk_index` with
   `finished_at` set and no failed siblings.
3. Treat rollback as forward-fix; do not replace this index with a blocking
   variant during rollout.

## Recovery

If a target database ends up with a failed row for this migration:

```bash
DATABASE_URL=... \
  npx prisma migrate resolve \
    --rolled-back 20260420191500_admin_v2_duplicate_idempotency_risk_index

DATABASE_URL=... npx prisma migrate deploy
```

This is safe because `CREATE INDEX IF NOT EXISTS` is idempotent.
