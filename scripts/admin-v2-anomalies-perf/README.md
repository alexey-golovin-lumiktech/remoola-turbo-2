# admin-v2 ledger anomaly perf runbook

Local-only tooling that backs slice **MVP-3.1b** (perf evidence + index reshape)
for the read-only ledger anomalies surface introduced in slice 3.1a.

This is **not** part of the production seed pipeline. Both scripts touch only
synthetic rows scoped under the `perf-anomaly-` consumer email namespace and
the `ledger_entry.metadata->>'perf_anomaly' = 'true'` flag.

## Files

- `seed.mjs` — generates ~5k consumers + ~50k `ledger_entry` rows (with 1–4
  outcomes each) plus deliberate stale/inconsistent/large-value injections so
  every anomaly class returns non-empty results.
- `measure.mjs` — runs the **exact** SQL shapes used by
  `AdminV2LedgerAnomaliesService` (1:1 copy, intentionally duplicated to keep
  the measurement script self-contained), reports p50/p95/p99/mean for each
  shape, and captures one `EXPLAIN (ANALYZE, BUFFERS)` per shape.
- `output/measure-*.json` (gitignored) — full measurement dumps consumed by
  `docs/admin-v2-mvp-3.1b-perf-evidence.md`.

## Prerequisites

1. `@remoola/database-2` workspace must be built / `prisma generate` already
   ran. Easiest path: `yarn install` from repo root (postinstall handles it).
2. `DATABASE_URL` pointing to a **disposable** Postgres (local `docker compose`
   db, ephemeral test db, throwaway branch). Never run against prod.
3. PostgreSQL 14+ (uses `EXPLAIN (ANALYZE, BUFFERS)`).

## Usage

```bash
DATABASE_URL=postgres://... node ./scripts/admin-v2-anomalies-perf/seed.mjs
DATABASE_URL=postgres://... node ./scripts/admin-v2-anomalies-perf/measure.mjs
DATABASE_URL=postgres://... node ./scripts/admin-v2-anomalies-perf/seed.mjs cleanup
```

### Seed

```bash
# Defaults: ~5,000 consumers, ~50,000 ledger entries.
node ./scripts/admin-v2-anomalies-perf/seed.mjs

# Override volumes (useful when iterating on index design):
node ./scripts/admin-v2-anomalies-perf/seed.mjs seed --consumers 1000 --entries 10000

# Clean up the synthetic dataset only (perf-anomaly namespace, cascades
# outcomes via FK, then drops perf consumers):
node ./scripts/admin-v2-anomalies-perf/seed.mjs cleanup
```

The seeder is idempotent — repeated `seed` runs only insert the delta needed to
hit the requested target, and `cleanup` removes everything it created (matching
on email prefix + metadata flag).

After insert it runs `ANALYZE` on `ledger_entry` and `ledger_entry_outcome` so
the planner statistics reflect the synthetic distribution before measurement.

### Measure

```bash
# Defaults: 100 iterations per query shape (warmup excluded).
node ./scripts/admin-v2-anomalies-perf/measure.mjs

# Custom run count (bigger smoothes p99, cheaper for quick iteration):
node ./scripts/admin-v2-anomalies-perf/measure.mjs 200
```

Output:

- Console summary with `p50 / p95 / p99 / mean` for each shape.
- Full JSON dump at `scripts/admin-v2-anomalies-perf/output/measure-<ts>.json`
  (numbers + `EXPLAIN` text for every shape) — paste relevant excerpts into
  `docs/admin-v2-mvp-3.1b-perf-evidence.md`.

The shapes measured today:

- `countStalePendingEntries`, `countInconsistentOutcomeChains`,
  `countLargeValueOutliers` — backing the summary endpoint.
- `summaryEndpoint:promiseAll` vs `summaryEndpoint:sequential` — used to make a
  data-driven decision about whether `Promise.all` in `getSummary` is worth
  keeping (cosmetic backlog item from the 3.1a audit).
- `listStalePendingEntries`, `listInconsistentOutcomeChains`,
  `listLargeValueOutliers` — backing the queue page (with `LIMIT 51`,
  matching `DEFAULT_ANOMALY_LIMIT`).

## Sync with the service

`measure.mjs` keeps an inline copy of the SQL shapes from
`apps/api-v2/src/admin-v2/ledger/anomalies/admin-v2-ledger-anomalies.service.ts`.
If you change a query shape there (anti-scope for slice 3.1b but realistic in
3.1c+), update the corresponding builder in `measure.mjs` in the same PR — the
script must keep reflecting the production query plan, not a stale snapshot.
