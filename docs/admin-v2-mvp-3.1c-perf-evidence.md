# MVP-3.1c Anomalies - Perf Evidence

> Status: landed | Phase: MVP-3.1c | Companion to [docs/admin-v2-mvp-3.1c-anomaly-classes-expansion.md](./admin-v2-mvp-3.1c-anomaly-classes-expansion.md) and [docs/admin-v2-mvp-3.1b-perf-evidence.md](./admin-v2-mvp-3.1b-perf-evidence.md)

## Scope

This doc closes the 3.1c performance proof for the three new anomaly classes:

- `orphanedEntries`
- `duplicateIdempotencyRisk`
- `impossibleTransitions`

It records:

1. the six-class summary endpoint budget result;
2. the exact post-migration `EXPLAIN ANALYZE` plans for the new count/list shapes;
3. the explicit `Seq Scan justification` accepted for `orphanedEntries` and `impossibleTransitions`;
4. the post-migration confirmation that the inner LATERAL for `impossibleTransitions` still uses `idx_ledger_entry_outcome_lateral_covering`.

## Method

- Synthetic dataset: 50,009 `ledger_entry` rows, 124,389 `ledger_entry_outcome` rows, seeded by `scripts/admin-v2-anomalies-perf/seed.mjs`.
- Measurement runner: `scripts/admin-v2-anomalies-perf/measure.mjs`.
- Iterations: 100 per shape, warmup excluded.
- Environment: local PostgreSQL 18.3 docker target, warm shared buffers, JIT enabled.
- Post-migration run captured from `scripts/admin-v2-anomalies-perf/output/measure-1776698652510.json` (gitignored local artifact).

## Headline

- `summaryEndpoint:promiseAll` p95 = **296.75 ms**
- six-class summary remains inside the **500 ms** summary endpoint budget with ~203 ms of p95 headroom
- `duplicateIdempotencyRisk` moved to the new partial index immediately after the migration:
  - `countDuplicateIdempotencyRisk` p95 = **1.04 ms**
  - `listDuplicateIdempotencyRisk` p95 = **1.90 ms**
- `impossibleTransitions` keeps the expensive outer scan on `ledger_entry`, but the inner LATERAL is still served by `idx_ledger_entry_outcome_lateral_covering` with `Heap Fetches: 0`

## Six-class summary

| Shape | p50 | p95 | p99 | mean |
| --- | ---: | ---: | ---: | ---: |
| `summaryEndpoint:promiseAll` | 221.85 ms | 296.75 ms | 308.91 ms | 228.78 ms |
| `summaryEndpoint:sequential` | 499.35 ms | 594.10 ms | 800.88 ms | 503.17 ms |

`Promise.all` remains the correct runtime choice. Sequential already breaches the budget on p95 for the six-class synthetic baseline, while the shipped parallel form remains comfortably green.

## New-class shapes

| Shape | p50 | p95 | p99 | mean |
| --- | ---: | ---: | ---: | ---: |
| `countOrphanedEntries` | 30.45 ms | 31.95 ms | 33.63 ms | 30.39 ms |
| `listOrphanedEntries` | 50.56 ms | 75.25 ms | 87.56 ms | 54.19 ms |
| `countDuplicateIdempotencyRisk` | 0.38 ms | 1.04 ms | 1.41 ms | 0.44 ms |
| `listDuplicateIdempotencyRisk` | 0.97 ms | 1.90 ms | 3.11 ms | 1.09 ms |
| `countImpossibleTransitions` | 208.78 ms | 237.45 ms | 257.08 ms | 207.31 ms |
| `listImpossibleTransitions` | 203.86 ms | 288.95 ms | 311.95 ms | 214.61 ms |

## Seq Scan justification

Accepted posture:

- `orphanedEntries`: keep the anti-join shape and accept planner-rational `Seq Scan` / `Hash Anti Join` on the synthetic dataset
- `duplicateIdempotencyRisk`: add exactly one partial index and re-measure
- `impossibleTransitions`: accept outer `Seq Scan on ledger_entry`, but require the inner LATERAL to stay on `idx_ledger_entry_outcome_lateral_covering`

| Shape | Synthetic density | Production expected density | Planner expected behaviour |
| --- | --- | --- | --- |
| `countOrphanedEntries` | 130 / 50,009 entries (`~0.26%`) | Near-zero healthy backlog; non-zero only during broken write/outcome ingestion gaps | `Seq Scan on ledger_entry` plus `Seq Scan on ledger_entry_outcome` into `Hash Anti Join` remains rational while both tables are still small and fully cacheable |
| `listOrphanedEntries` | 130 / 50,009 entries (`~0.26%`) in the 30d list window | Same as count; expected operational backlog should stay sparse | Same planner story as count; top-N sort over a tiny result set is cheaper than maintaining another specialized anti-join index in this slice |
| `countDuplicateIdempotencyRisk` | 200 / 50,009 entries (`~0.40%`) | Ideally near-zero; any sustained backlog means Stripe-source writes are landing without a key | Post-migration planner should use `idx_ledger_entry_duplicate_idempotency_risk`; this already happens on the synthetic run via `Index Only Scan` |
| `listDuplicateIdempotencyRisk` | 200 / 50,009 entries (`~0.40%`) in the 30d list window | Same as count; narrow operational backlog if it appears at all | Post-migration planner should use `idx_ledger_entry_duplicate_idempotency_risk`; this already happens via `Index Scan` aligned with the cursor order |
| `countImpossibleTransitions` | 15,443 / 50,009 entries (`~30.88%`) | Expected near-zero on a healthy system; synthetic density is intentionally adversarial to exercise the invariant | Outer `Seq Scan on ledger_entry` is rational on synthetic density because the violation test must touch nearly every candidate entry; the inner LATERAL must stay on `idx_ledger_entry_outcome_lateral_covering` |
| `listImpossibleTransitions` | 7,834 / 50,009 entries (`~15.67%`) in the 30d list window | Expected near-zero healthy backlog; any non-zero cluster is operator-significant | Same as count: outer seq scan remains rational on the synthetic adversarial dataset, while the inner LATERAL must remain index-only on the covering outcome index |

## LATERAL confirmation

Both post-migration `impossibleTransitions` plans still contain:

- `Index Only Scan Backward using idx_ledger_entry_outcome_lateral_covering on ledger_entry_outcome o`
- `Heap Fetches: 0`
- `Index Searches: 50009`

That satisfies the 3.1c acceptance requirement. No separate §15 escalation remained open.

## Full EXPLAIN dumps

### `countOrphanedEntries`

```text
Aggregate  (cost=5814.27..5814.28 rows=1 width=4) (actual time=40.413..40.416 rows=1.00 loops=1)
  Buffers: shared hit=2127
  ->  Hash Anti Join  (cost=3961.71..5797.53 rows=6696 width=0) (actual time=28.410..40.404 rows=130.00 loops=1)
        Hash Cond: (le.id = o.ledger_entry_id)
        Buffers: shared hit=2127
        ->  Seq Scan on ledger_entry le  (cost=0.00..1589.11 rows=49942 width=16) (actual time=0.006..6.843 rows=49985.00 loops=1)
              Filter: ((deleted_at IS NULL) AND (created_at < '2026-04-20 14:24:11.659+00'::timestamp with time zone))
              Rows Removed by Filter: 24
              Buffers: shared hit=964
        ->  Hash  (cost=2406.87..2406.87 rows=124387 width=16) (actual time=24.456..24.458 rows=124389.00 loops=1)
              Buckets: 131072  Batches: 1  Memory Usage: 6855kB
              Buffers: shared hit=1163
              ->  Seq Scan on ledger_entry_outcome o  (cost=0.00..2406.87 rows=124387 width=16) (actual time=0.004..8.146 rows=124389.00 loops=1)
                    Buffers: shared hit=1163
Planning:
  Buffers: shared hit=14
Planning Time: 0.146 ms
Execution Time: 41.038 ms
```

### `listOrphanedEntries`

```text
Limit  (cost=6090.99..6091.12 rows=51 width=315) (actual time=35.365..35.372 rows=51.00 loops=1)
  Buffers: shared hit=2127
  ->  Sort  (cost=6090.99..6099.50 rows=3405 width=315) (actual time=35.364..35.368 rows=51.00 loops=1)
        Sort Key: le.created_at DESC, le.id DESC
        Sort Method: top-N heapsort  Memory: 38kB
        Buffers: shared hit=2127
        ->  Hash Anti Join  (cost=3961.71..5977.39 rows=3405 width=315) (actual time=27.159..35.319 rows=130.00 loops=1)
              Hash Cond: (le.id = o.ledger_entry_id)
              Buffers: shared hit=2127
              ->  Seq Scan on ledger_entry le  (cost=0.00..1839.16 rows=25396 width=67) (actual time=0.006..5.870 rows=25520.00 loops=1)
                    Filter: ((deleted_at IS NULL) AND (created_at < '2026-04-20 14:24:12.202+00'::timestamp with time zone) AND (created_at >= '2026-03-21 15:24:12.202+00'::timestamp with time zone) AND (created_at <= '2026-04-20 15:24:12.202+00'::timestamp with time zone))
                    Rows Removed by Filter: 24489
                    Buffers: shared hit=964
              ->  Hash  (cost=2406.87..2406.87 rows=124387 width=16) (actual time=24.921..24.922 rows=124389.00 loops=1)
                    Buckets: 131072  Batches: 1  Memory Usage: 6855kB
                    Buffers: shared hit=1163
                    ->  Seq Scan on ledger_entry_outcome o  (cost=0.00..2406.87 rows=124387 width=16) (actual time=0.004..8.094 rows=124389.00 loops=1)
                          Buffers: shared hit=1163
Planning:
  Buffers: shared hit=28
Planning Time: 0.210 ms
Execution Time: 35.740 ms
```

### `countDuplicateIdempotencyRisk`

```text
Aggregate  (cost=34.54..34.55 rows=1 width=4) (actual time=0.055..0.056 rows=1.00 loops=1)
  Buffers: shared hit=2
  ->  Index Only Scan using idx_ledger_entry_duplicate_idempotency_risk on ledger_entry le  (cost=0.14..34.27 rows=107 width=0) (actual time=0.023..0.040 rows=200.00 loops=1)
        Index Cond: ((created_at >= '2026-03-21 15:24:11.702+00'::timestamp with time zone) AND (created_at <= '2026-04-20 15:24:11.702+00'::timestamp with time zone))
        Heap Fetches: 0
        Index Searches: 1
        Buffers: shared hit=2
Planning Time: 0.110 ms
Execution Time: 0.076 ms
```

### `listDuplicateIdempotencyRisk`

```text
Limit  (cost=0.14..200.10 rows=51 width=323) (actual time=0.049..0.114 rows=51.00 loops=1)
  Buffers: shared hit=43
  ->  Index Scan using idx_ledger_entry_duplicate_idempotency_risk on ledger_entry le  (cost=0.14..419.66 rows=107 width=323) (actual time=0.046..0.109 rows=51.00 loops=1)
        Index Cond: ((created_at >= '2026-03-21 15:24:12.239+00'::timestamp with time zone) AND (created_at <= '2026-04-20 15:24:12.239+00'::timestamp with time zone))
        Index Searches: 1
        Buffers: shared hit=43
Planning Time: 0.193 ms
Execution Time: 0.150 ms
```

### `countImpossibleTransitions`

```text
Aggregate  (cost=138454.02..138454.03 rows=1 width=4) (actual time=223.992..223.993 rows=1.00 loops=1)
  Buffers: shared hit=152044
  ->  Nested Loop  (cost=1.79..138329.00 rows=50009 width=0) (actual time=8.418..222.455 rows=15443.00 loops=1)
        Buffers: shared hit=152044
        ->  Seq Scan on ledger_entry le  (cost=0.00..1464.09 rows=50009 width=16) (actual time=8.284..19.063 rows=50009.00 loops=1)
              Filter: (deleted_at IS NULL)
              Buffers: shared hit=964
        ->  Limit  (cost=1.79..2.72 rows=1 width=4) (actual time=0.004..0.004 rows=0.31 loops=50009)
              Buffers: shared hit=151080
              ->  Subquery Scan on chain  (cost=1.79..4.58 rows=3 width=4) (actual time=0.004..0.004 rows=0.31 loops=50009)
                    Filter: ((chain.prev_status)::text = ANY ('{COMPLETED,DENIED,UNCOLLECTIBLE}'::text[]))
                    Rows Removed by Filter: 2
                    Buffers: shared hit=151080
                    ->  WindowAgg  (cost=1.79..4.52 rows=3 width=32) (actual time=0.003..0.003 rows=2.24 loops=50009)
                          Window: w1 AS (ORDER BY o.created_at, o.id)
                          Storage: Memory  Maximum Storage: 17kB
                          Buffers: shared hit=151080
                          ->  Index Only Scan Backward using idx_ledger_entry_outcome_lateral_covering on ledger_entry_outcome o  (cost=0.42..4.47 rows=3 width=28) (actual time=0.002..0.002 rows=2.43 loops=50009)
                                Index Cond: (ledger_entry_id = le.id)
                                Heap Fetches: 0
                                Index Searches: 50009
                                Buffers: shared hit=151080
Planning Time: 0.162 ms
JIT:
  Functions: 16
  Options: Inlining false, Optimization false, Expressions true, Deforming true
  Timing: Generation 0.844 ms (Deform 0.318 ms), Inlining 0.000 ms, Optimization 0.417 ms, Emission 7.902 ms, Total 9.163 ms
Execution Time: 224.908 ms
```

### `listImpossibleTransitions`

```text
Limit  (cost=236236.95..236237.08 rows=51 width=315) (actual time=265.926..265.934 rows=51.00 loops=1)
  Buffers: shared hit=152330
  ->  Sort  (cost=236236.95..236361.97 rows=50009 width=315) (actual time=257.544..257.549 rows=51.00 loops=1)
        Sort Key: chain.violation_at DESC, le.id DESC
        Sort Method: top-N heapsort  Memory: 47kB
        Buffers: shared hit=152330
        ->  Nested Loop  (cost=4.61..234568.54 rows=50009 width=315) (actual time=0.099..254.274 rows=7834.00 loops=1)
              Buffers: shared hit=152330
              ->  Seq Scan on ledger_entry le  (cost=0.00..1464.09 rows=50009 width=67) (actual time=0.017..10.742 rows=50009.00 loops=1)
                    Filter: (deleted_at IS NULL)
                    Buffers: shared hit=964
              ->  Limit  (cost=4.61..4.61 rows=1 width=16) (actual time=0.005..0.005 rows=0.16 loops=50009)
                    Buffers: shared hit=151366
                    ->  Sort  (cost=4.61..4.62 rows=3 width=16) (actual time=0.004..0.004 rows=0.16 loops=50009)
                          Sort Key: chain.violation_at DESC
                          Sort Method: quicksort  Memory: 25kB
                          Buffers: shared hit=151366
                          ->  Subquery Scan on chain  (cost=1.79..4.59 rows=3 width=16) (actual time=0.004..0.004 rows=0.16 loops=50009)
                                Filter: ((chain.violation_at >= '2026-03-21 15:24:12.241+00'::timestamp with time zone) AND (chain.violation_at <= '2026-04-20 15:24:12.241+00'::timestamp with time zone) AND ((chain.prev_status)::text = ANY ('{COMPLETED,DENIED,UNCOLLECTIBLE}'::text[])))
                                Rows Removed by Filter: 2
                                Buffers: shared hit=151366
                                ->  WindowAgg  (cost=1.79..4.52 rows=3 width=32) (actual time=0.003..0.003 rows=2.49 loops=50009)
                                      Window: w1 AS (ORDER BY o.created_at, o.id)
                                      Storage: Memory  Maximum Storage: 17kB
                                      Buffers: shared hit=151366
                                      ->  Index Only Scan Backward using idx_ledger_entry_outcome_lateral_covering on ledger_entry_outcome o  (cost=0.42..4.47 rows=3 width=28) (actual time=0.002..0.002 rows=2.49 loops=50009)
                                            Index Cond: (ledger_entry_id = le.id)
                                            Heap Fetches: 0
                                            Index Searches: 50009
                                            Buffers: shared hit=151366
Planning Time: 0.164 ms
JIT:
  Functions: 17
  Options: Inlining false, Optimization false, Expressions true, Deforming true
  Timing: Generation 0.791 ms (Deform 0.338 ms), Inlining 0.000 ms, Optimization 0.427 ms, Emission 7.965 ms, Total 9.184 ms
Execution Time: 266.797 ms
```
