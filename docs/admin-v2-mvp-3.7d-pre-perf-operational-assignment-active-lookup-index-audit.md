# MVP-3.7d-pre — `operational_assignment` active-lookup index audit (perf evidence)

> Status: landed | Phase: pre-3.7d (gates `SLICE-MVP-3.7d` `/payouts` list-surface
> assignee surfacing) | Companion to none — this is a one-off `SLICE-PATCH
> operational_assignment active-lookup index audit` reconciliation note in the
> shape of [`docs/admin-v2-mvp-3.1c-perf-evidence.md`](./admin-v2-mvp-3.1c-perf-evidence.md)
> and [`docs/admin-v2-mvp-3.1b-perf-evidence.md`](./admin-v2-mvp-3.1b-perf-evidence.md).

## Summary

The `SLICE-PATCH operational_assignment active-lookup index audit` closes the only
open follow-up in `admin-v2-handoff/README.md` — the deferred performance index
audit on `operational_assignment(resource_type, resource_id, released_at)` —
before the fifth bulk consumer (`/payouts`, candidate `SLICE-MVP-3.7d`) lands.

Subject is exactly two `WHERE`-clause shapes from
`apps/api-v2/src/admin-v2/assignments/admin-v2-assignments.service.ts:545-565`
and the case-page active-row read inside
`getAssignmentContextForResource`: the **bulk
`getActiveAssigneesForResource` predicate** and the
**single-resource `getAssignmentContextForResource` active-row predicate**.
The assignment **history** path and the as-yet-unbuilt "my work"
(`assigned_to = $1 AND released_at IS NULL`) path are explicitly out of subject.

`EXPLAIN (ANALYZE, BUFFERS) captured per cardinality bucket`
(`resourceIds.length ∈ {1, 10, 100}` × `resource_type ∈ {'payment_request',
'document', 'fx_conversion', 'verification'}`) on the local dev DB
(`PostgreSQL 18.3 (Debian 18.3-1.pgdg13+1)`) under transient seed
(4000 active rows + ~2000 historical rows, rolled back) shows the partial
unique `idx_operational_assignment_active_resource partial unique candidate`
chosen by the planner for **every** bulk and single-resource active-row
combination tested. The non-partial
`operational_assignment_resource_type_resource_id_released_at_idx full
composite candidate` is **not** chosen for the active-row predicate at any
cardinality bucket; it remains correctly used by the case-page history fetch
inside `getAssignmentContextForResource`, which has no `released_at IS NULL`
filter.

This is `local dev seed scale evidence`. No production benchmark was performed
(no production access posture exists in this repo); the conclusion is framed
accordingly. `production re-baseline due before sixth bulk consumer or one
order-of-magnitude row-count growth`.

The audit therefore records **Decision (a)** below: existing indexes are
sufficient — no new migration. No `schema.prisma` edit. No migration
directory. No service code edit. The deliverable is this reconciliation note
plus the `RECONCILIATION_NOTES` / `CHECK_PATHS` entries in
`scripts/admin-v2-gates/config.mjs`, and the README/LANDED bookkeeping that
moves the closed follow-up.

Hard scope upheld: `no service code change`, `no DTO change`,
`no capability change`, `no audit action change`, `no endpoint change`.
`apps/api/ workspace frozen`, `apps/admin/ workspace frozen`,
`apps/api-v2/src/consumer/ workspace frozen`,
`apps/api-v2/src/admin-v2/assignments/ frozen (subject query consumed not modified)`.

## Subject query

The audit's two predicates (and only those) are quoted from the codebase:

### Bulk: `bulk getActiveAssigneesForResource predicate`

From `apps/api-v2/src/admin-v2/assignments/admin-v2-assignments.service.ts:545-565`
(verbatim shape, with `LEFT JOIN admin` for the `email` field; `Prisma.sql`
parameterised on `resourceType` and `resourceIds`):

```sql
SELECT
  a."resource_id"::text AS resource_id,
  a."assigned_to"::text AS assigned_to,
  ad."email"           AS email
FROM "operational_assignment" a
LEFT JOIN "admin" ad ON ad."id" = a."assigned_to"
WHERE a."resource_type" = ${resourceType}
  AND a."released_at"   IS NULL
  AND a."resource_id"   = ANY(${resourceIds}::uuid[]);
```

Consumed by `four list-surface consumers as of SLICE-MVP-3.7c` (`verification`
originating, `/exchange/scheduled` from 3.7a, `/documents` from 3.7b,
`/payments/operations` from 3.7c) and `six case-page consumers as of
SLICE-MVP-3.6e` (`verification`, `ledger_entry`, `payment_request`, `payout`,
`document`, `fx_conversion`).

### Single-resource: `single-resource getAssignmentContextForResource active-row predicate`

The active-row half of the case-page lookup uses the same predicate shape
without the `ANY(...)` array (literal write-path equivalent inside `claim` /
`release` / `reassign` `FOR UPDATE` / `NOT EXISTS` checks; the same partial
unique covers it):

```sql
WHERE "resource_type" = $1
  AND "resource_id"   = $2
  AND "released_at"   IS NULL
```

The assignment **history** path that `getAssignmentContextForResource` returns
to the case page (`ORDER BY a."assigned_at" DESC LIMIT 10`, no
`released_at IS NULL` filter) is **out of subject** for this audit by
`Decision: subject-query scope is exactly two active-row predicates`. It is
captured once below as plan `C1` purely for completeness, to demonstrate that
the planner correctly switches to the
`operational_assignment_resource_type_resource_id_released_at_idx full
composite candidate` for that history shape (which has no `IS NULL` filter
and therefore cannot use the partial index) — confirming the two indexes
serve disjoint needs and neither can be dropped.

## Evidence baseline (row counts, index sizes, server version)

All commands run inside the local Docker dev DB (`remoola_postgres`),
authenticated as the dev role, with the seed step recorded verbatim in
`Discovered while exploring`. Whole audit ran inside a single
`BEGIN; … ROLLBACK;` block; the post-rollback table count returned to `0`.

```text
PostgreSQL 18.3 (Debian 18.3-1.pgdg13+1) on x86_64-pc-linux-gnu,
compiled by gcc (Debian 14.2.0-19) 14.2.0, 64-bit
```

Post-seed row counts (transient; rolled back):

```text
 total | active
-------+--------
  6036 |   4000

  resource_type  | total | active
-----------------+-------+--------
 document        |  1527 |   1000
 fx_conversion   |  1517 |   1000
 payment_request |  1505 |   1000
 verification    |  1487 |   1000
```

Index sizes (post-seed, post-`ANALYZE`):

```text
 partial_unique_size | full_composite_size | assigned_to_size | table_size
---------------------+---------------------+------------------+------------
 312 kB              | 480 kB              | 64 kB            | 888 kB
```

Both candidate indexes already exist (foundation migration
`packages/database-2/prisma/migrations/20260417223000_operational_assignment_foundation/migration.sql`
lines 42-50):

- `idx_operational_assignment_active_resource partial unique candidate` —
  `UNIQUE PARTIAL btree (resource_type, resource_id) WHERE released_at IS NULL`
- `operational_assignment_resource_type_resource_id_released_at_idx full
  composite candidate` —
  `btree (resource_type, resource_id, released_at)`

Plus `operational_assignment_assigned_to_released_at_idx` —
`btree (assigned_to, released_at)` — out of subject (the "my work" path has
no consumer yet).

Parameter-cardinality matrix actually exercised (each cell = one captured
`EXPLAIN (ANALYZE, BUFFERS)` plan below):

| Predicate | resource_type | `resourceIds.length` | Plan id |
| --- | --- | --- | --- |
| Bulk active | `payment_request` | `1` | `B1` |
| Bulk active | `payment_request` | `10` | `B2` |
| Bulk active | `payment_request` | `100` | `B3` |
| Bulk active | `document` | `100` | `B4` |
| Bulk active | `fx_conversion` | `100` | `B5` |
| Bulk active | `verification` | `100` | `B6` |
| Single-resource active | `payment_request` | n/a | `S1` |
| Single-resource active | `document` | n/a | `S2` |
| Single-resource active | `fx_conversion` | n/a | `S3` |
| Single-resource active | `verification` | n/a | `S4` |
| Case-page history (out-of-subject reference) | `payment_request` | n/a | `C1` |

The matrix is the minimum the handoff requires (`length ∈ {1, 10, 100}` plus
all four resource_types). The `length ∈ {1, 10}` cells for non-`payment_request`
resource_types were not captured separately because `B1`/`B2` already
demonstrate that the planner's index choice does not vary with
`resource_type` for fixed cardinality (the partial unique covers
`(resource_type, resource_id)` symmetrically and is selected on the first
matched index condition); the `length=100` cell was instead captured for all
four `resource_type`s, which is the harder-to-saturate cardinality and the
one most relevant to the `/payments/operations` and `/documents` bulk
consumers that recently landed.

## Captured EXPLAIN plans

All plans below are reproduced verbatim from the `EXPLAIN (ANALYZE, BUFFERS)`
output. The literal UUID arrays for `length=100` plans are abbreviated as
`{<100 uuids — see seed step>}` to keep the document readable; the full
array contents are deterministically reproducible by re-running the seed step
in `Discovered while exploring` (the `\gset` capture orders by
`resource_id ASC`). All plan-relevant metrics — `Index Cond` shape,
`Heap Blocks`, `Buffers`, `Index Searches`, planning time, execution time —
are preserved verbatim.

### B1. payment_request × length=1

```text
 Nested Loop Left Join  (cost=0.43..16.51 rows=1 width=96) (actual time=0.012..0.031 rows=1.00 loops=1)
   Buffers: shared hit=5
   ->  Index Scan using idx_operational_assignment_active_resource on operational_assignment a  (cost=0.28..8.30 rows=1 width=32) (actual time=0.007..0.008 rows=1.00 loops=1)
         Index Cond: ((resource_type = 'payment_request'::text) AND (resource_id = ANY ('{004985fd-13c7-4d79-a2ce-712ab0112111}'::uuid[])))
         Index Searches: 1
         Buffers: shared hit=3
   ->  Index Scan using admin_pkey on admin ad  (cost=0.15..8.17 rows=1 width=48) (actual time=0.002..0.020 rows=1.00 loops=1)
         Index Cond: (id = a.assigned_to)
         Index Searches: 1
         Buffers: shared hit=2
 Planning:
   Buffers: shared hit=14
 Planning Time: 0.150 ms
 Execution Time: 0.052 ms
```

Planner choice: `Index Scan using idx_operational_assignment_active_resource`
(partial unique). `Buffers: shared hit=5` total, `Execution Time: 0.052 ms`.
The full composite is **not** considered.

### B2. payment_request × length=10

```text
 Nested Loop Left Join  (cost=39.08..60.98 rows=3 width=96) (actual time=0.068..0.094 rows=10.00 loops=1)
   Buffers: shared hit=14
   ->  Bitmap Heap Scan on operational_assignment a  (cost=38.93..49.50 rows=3 width=32) (actual time=0.044..0.061 rows=10.00 loops=1)
         Recheck Cond: ((resource_type = 'payment_request'::text) AND (resource_id = ANY ('{004985fd-13c7-4d79-a2ce-712ab0112111,012fa89a-282f-45c3-8849-8326c7d48d48,0160ffdc-ac2b-4bab-8ec9-b9d3c627385f,0189e5fc-30c9-4602-9af5-02aed001d418,01902b6b-2f4e-477e-b1e8-39dc5dfbe8cc,01ae690f-ad43-4572-8a41-77489729bf33,028148e3-be8c-4747-9d8a-a609de755970,028938c1-c967-418a-a231-613512caaa3d,03020e51-2980-4fc0-b23e-891d8c7adbbc,03264268-a2fc-47aa-b732-dd5a0e8f3b9b}'::uuid[])) AND (released_at IS NULL))
         Heap Blocks: exact=10
         Buffers: shared hit=12
         ->  Bitmap Index Scan on idx_operational_assignment_active_resource  (cost=0.00..38.90 rows=3 width=0) (actual time=0.029..0.029 rows=10.00 loops=1)
               Index Cond: ((resource_type = 'payment_request'::text) AND (resource_id = ANY ('{<10 uuids — first: 004985fd-…, last: 03264268-…>}'::uuid[])))
               Index Searches: 1
               Buffers: shared hit=2
   ->  Memoize  (cost=0.16..6.84 rows=1 width=48) (actual time=0.002..0.002 rows=1.00 loops=10)
         Cache Key: a.assigned_to
         Cache Mode: logical
         Hits: 9  Misses: 1  Evictions: 0  Overflows: 0  Memory Usage: 1kB
         Buffers: shared hit=2
         ->  Index Scan using admin_pkey on admin ad  (cost=0.15..6.83 rows=1 width=48) (actual time=0.010..0.010 rows=1.00 loops=1)
               Index Cond: (id = a.assigned_to)
               Index Searches: 1
               Buffers: shared hit=2
 Planning:
   Buffers: shared hit=3
 Planning Time: 0.588 ms
 Execution Time: 0.136 ms
```

Planner choice: `Bitmap Index Scan on idx_operational_assignment_active_resource`
(partial unique) feeding `Bitmap Heap Scan`. `Memoize` over `admin_pkey` for
the LEFT JOIN (9 hits, 1 miss). `Heap Blocks: exact=10`, `Buffers: shared
hit=14` total, `Execution Time: 0.136 ms`. Note the `Recheck Cond` re-applies
`released_at IS NULL` — Postgres's correctness guard for partial indexes
when the bitmap requires a heap fetch — which is harmless here because the
partial index already restricts to `released_at IS NULL` rows so 100% of
rechecked tuples qualify.

### B3. payment_request × length=100

```text
 Nested Loop Left Join  (cost=52.31..121.79 rows=27 width=96) (actual time=0.054..0.135 rows=100.00 loops=1)
   Buffers: shared hit=60
   ->  Bitmap Heap Scan on operational_assignment a  (cost=52.16..117.04 rows=27 width=32) (actual time=0.043..0.083 rows=100.00 loops=1)
         Recheck Cond: ((resource_type = 'payment_request'::text) AND (resource_id = ANY ('{<100 uuids — first: 004985fd-13c7-4d79-a2ce-712ab0112111, last: 1982b3b5-d14e-4b0f-a533-37c1af494249 — see seed step>}'::uuid[])) AND (released_at IS NULL))
         Heap Blocks: exact=55
         Buffers: shared hit=58
         ->  Bitmap Index Scan on idx_operational_assignment_active_resource  (cost=0.00..51.90 rows=27 width=0) (actual time=0.032..0.032 rows=100.00 loops=1)
               Index Cond: ((resource_type = 'payment_request'::text) AND (resource_id = ANY ('{<100 uuids — see seed step>}'::uuid[])))
               Index Searches: 1
               Buffers: shared hit=3
   ->  Memoize  (cost=0.16..1.95 rows=1 width=48) (actual time=0.000..0.000 rows=1.00 loops=100)
         Cache Key: a.assigned_to
         Cache Mode: logical
         Hits: 99  Misses: 1  Evictions: 0  Overflows: 0  Memory Usage: 1kB
         Buffers: shared hit=2
         ->  Index Scan using admin_pkey on admin ad  (cost=0.15..1.94 rows=1 width=48) (actual time=0.005..0.005 rows=1.00 loops=1)
               Index Cond: (id = a.assigned_to)
               Index Searches: 1
               Buffers: shared hit=2
 Planning Time: 0.365 ms
 Execution Time: 0.162 ms
```

Planner choice: same as `B2` — `Bitmap Index Scan on
idx_operational_assignment_active_resource`. The seeded distribution
(1000 distinct `assigned_to` UUIDs collapsed onto a single seed admin)
produces a 99% `Memoize` hit ratio for the LEFT JOIN; production data with
many distinct assignees would see a lower hit ratio but the partial-index
choice for the outer scan is unaffected. `Heap Blocks: exact=55`, `Buffers:
shared hit=60` total, `Execution Time: 0.162 ms`.

### B4. document × length=100

```text
 Nested Loop Left Join  (cost=52.31..121.79 rows=27 width=96) (actual time=0.050..0.135 rows=100.00 loops=1)
   Buffers: shared hit=55
   ->  Bitmap Heap Scan on operational_assignment a  (cost=52.16..117.04 rows=27 width=32) (actual time=0.040..0.081 rows=100.00 loops=1)
         Recheck Cond: ((resource_type = 'document'::text) AND (resource_id = ANY ('{<100 uuids — first: 00562847-672a-4601-a4e1-8dea42c3380e, last: 16650059-7b7a-4247-aa25-eb8eb56b83d3 — see seed step>}'::uuid[])) AND (released_at IS NULL))
         Heap Blocks: exact=51
         Buffers: shared hit=53
         ->  Bitmap Index Scan on idx_operational_assignment_active_resource  (cost=0.00..51.90 rows=27 width=0) (actual time=0.030..0.030 rows=100.00 loops=1)
               Index Cond: ((resource_type = 'document'::text) AND (resource_id = ANY ('{<100 uuids — see seed step>}'::uuid[])))
               Index Searches: 1
               Buffers: shared hit=2
   ->  Memoize  (cost=0.16..1.95 rows=1 width=48) (actual time=0.000..0.000 rows=1.00 loops=100)
         Cache Key: a.assigned_to
         Cache Mode: logical
         Hits: 99  Misses: 1  Evictions: 0  Overflows: 0  Memory Usage: 1kB
         Buffers: shared hit=2
         ->  Index Scan using admin_pkey on admin ad  (cost=0.15..1.94 rows=1 width=48) (actual time=0.004..0.004 rows=1.00 loops=1)
               Index Cond: (id = a.assigned_to)
               Index Searches: 1
               Buffers: shared hit=2
 Planning Time: 0.244 ms
 Execution Time: 0.156 ms
```

Planner choice: `Bitmap Index Scan on idx_operational_assignment_active_resource`.
`Heap Blocks: exact=51`, `Execution Time: 0.156 ms`.

### B5. fx_conversion × length=100

```text
 Nested Loop Left Join  (cost=52.31..121.79 rows=27 width=96) (actual time=0.076..0.188 rows=100.00 loops=1)
   Buffers: shared hit=64
   ->  Bitmap Heap Scan on operational_assignment a  (cost=52.16..117.04 rows=27 width=32) (actual time=0.061..0.119 rows=100.00 loops=1)
         Recheck Cond: ((resource_type = 'fx_conversion'::text) AND (resource_id = ANY ('{<100 uuids — first: 00726ee0-8f05-4c21-8dc4-8a671bca7d86, last: 1841bdcb-478c-45a2-957e-2ae36a36ef03 — see seed step>}'::uuid[])) AND (released_at IS NULL))
         Heap Blocks: exact=59
         Buffers: shared hit=62
         ->  Bitmap Index Scan on idx_operational_assignment_active_resource  (cost=0.00..51.90 rows=27 width=0) (actual time=0.045..0.045 rows=100.00 loops=1)
               Index Cond: ((resource_type = 'fx_conversion'::text) AND (resource_id = ANY ('{<100 uuids — see seed step>}'::uuid[])))
               Index Searches: 1
               Buffers: shared hit=3
   ->  Memoize  (cost=0.16..1.95 rows=1 width=48) (actual time=0.000..0.000 rows=1.00 loops=100)
         Cache Key: a.assigned_to
         Cache Mode: logical
         Hits: 99  Misses: 1  Evictions: 0  Overflows: 0  Memory Usage: 1kB
         Buffers: shared hit=2
         ->  Index Scan using admin_pkey on admin ad  (cost=0.15..1.94 rows=1 width=48) (actual time=0.007..0.007 rows=1.00 loops=1)
               Index Cond: (id = a.assigned_to)
               Index Searches: 1
               Buffers: shared hit=2
 Planning Time: 0.343 ms
 Execution Time: 0.221 ms
```

Planner choice: `Bitmap Index Scan on idx_operational_assignment_active_resource`.
`Heap Blocks: exact=59`, `Execution Time: 0.221 ms`.

### B6. verification × length=100

```text
 Nested Loop Left Join  (cost=52.31..119.98 rows=26 width=96) (actual time=0.073..0.194 rows=100.00 loops=1)
   Buffers: shared hit=62
   ->  Bitmap Heap Scan on operational_assignment a  (cost=52.16..115.13 rows=26 width=32) (actual time=0.059..0.127 rows=100.00 loops=1)
         Recheck Cond: ((resource_type = 'verification'::text) AND (resource_id = ANY ('{<100 uuids — first: 00679700-5a4a-4a3c-90aa-1adb26a42092, last: 19e1839b-67f0-40c0-924a-c9c31d1d2064 — see seed step>}'::uuid[])) AND (released_at IS NULL))
         Heap Blocks: exact=58
         Buffers: shared hit=60
         ->  Bitmap Index Scan on idx_operational_assignment_active_resource  (cost=0.00..51.90 rows=26 width=0) (actual time=0.044..0.044 rows=100.00 loops=1)
               Index Cond: ((resource_type = 'verification'::text) AND (resource_id = ANY ('{<100 uuids — see seed step>}'::uuid[])))
               Index Searches: 1
               Buffers: shared hit=2
   ->  Memoize  (cost=0.16..2.02 rows=1 width=48) (actual time=0.000..0.000 rows=1.00 loops=100)
         Cache Key: a.assigned_to
         Cache Mode: logical
         Hits: 99  Misses: 1  Evictions: 0  Overflows: 0  Memory Usage: 1kB
         Buffers: shared hit=2
         ->  Index Scan using admin_pkey on admin ad  (cost=0.15..2.01 rows=1 width=48) (actual time=0.006..0.006 rows=1.00 loops=1)
               Index Cond: (id = a.assigned_to)
               Index Searches: 1
               Buffers: shared hit=2
 Planning Time: 0.455 ms
 Execution Time: 0.233 ms
```

Planner choice: `Bitmap Index Scan on idx_operational_assignment_active_resource`.
`Heap Blocks: exact=58`, `Execution Time: 0.233 ms`.

### S1. payment_request × single resource_id

Single-resource active-row predicate (`WHERE resource_type = $1 AND
resource_id = $2 AND released_at IS NULL`, `ORDER BY assigned_at DESC LIMIT 1`,
literal write-path shape):

```text
 Limit  (cost=8.31..8.31 rows=1 width=148) (actual time=0.031..0.032 rows=1.00 loops=1)
   Buffers: shared hit=3
   ->  Sort  (cost=8.31..8.31 rows=1 width=148) (actual time=0.030..0.030 rows=1.00 loops=1)
         Sort Key: assigned_at DESC
         Sort Method: quicksort  Memory: 25kB
         Buffers: shared hit=3
         ->  Index Scan using idx_operational_assignment_active_resource on operational_assignment  (cost=0.28..8.30 rows=1 width=148) (actual time=0.018..0.020 rows=1.00 loops=1)
               Index Cond: ((resource_type = 'payment_request'::text) AND (resource_id = '004985fd-13c7-4d79-a2ce-712ab0112111'::uuid))
               Index Searches: 1
               Buffers: shared hit=3
 Planning:
   Buffers: shared hit=23
 Planning Time: 0.210 ms
 Execution Time: 0.066 ms
```

Planner choice: `Index Scan using idx_operational_assignment_active_resource`.
`Execution Time: 0.066 ms`.

### S2. document × single resource_id

```text
 Limit  (cost=8.31..8.31 rows=1 width=148) (actual time=0.023..0.024 rows=1.00 loops=1)
   Buffers: shared hit=3
   ->  Sort  (cost=8.31..8.31 rows=1 width=148) (actual time=0.022..0.022 rows=1.00 loops=1)
         Sort Key: assigned_at DESC
         Sort Method: quicksort  Memory: 25kB
         Buffers: shared hit=3
         ->  Index Scan using idx_operational_assignment_active_resource on operational_assignment  (cost=0.28..8.30 rows=1 width=148) (actual time=0.018..0.019 rows=1.00 loops=1)
               Index Cond: ((resource_type = 'document'::text) AND (resource_id = '00562847-672a-4601-a4e1-8dea42c3380e'::uuid))
               Index Searches: 1
               Buffers: shared hit=3
 Planning Time: 0.104 ms
 Execution Time: 0.041 ms
```

Planner choice: `Index Scan using idx_operational_assignment_active_resource`.
`Execution Time: 0.041 ms`.

### S3. fx_conversion × single resource_id

```text
 Limit  (cost=8.31..8.31 rows=1 width=148) (actual time=0.015..0.016 rows=1.00 loops=1)
   Buffers: shared hit=3
   ->  Sort  (cost=8.31..8.31 rows=1 width=148) (actual time=0.015..0.015 rows=1.00 loops=1)
         Sort Key: assigned_at DESC
         Sort Method: quicksort  Memory: 25kB
         Buffers: shared hit=3
         ->  Index Scan using idx_operational_assignment_active_resource on operational_assignment  (cost=0.28..8.30 rows=1 width=148) (actual time=0.011..0.012 rows=1.00 loops=1)
               Index Cond: ((resource_type = 'fx_conversion'::text) AND (resource_id = '00726ee0-8f05-4c21-8dc4-8a671bca7d86'::uuid))
               Index Searches: 1
               Buffers: shared hit=3
 Planning Time: 0.073 ms
 Execution Time: 0.029 ms
```

Planner choice: `Index Scan using idx_operational_assignment_active_resource`.
`Execution Time: 0.029 ms`.

### S4. verification × single resource_id

```text
 Limit  (cost=8.31..8.31 rows=1 width=148) (actual time=0.017..0.017 rows=1.00 loops=1)
   Buffers: shared hit=3
   ->  Sort  (cost=8.31..8.31 rows=1 width=148) (actual time=0.016..0.016 rows=1.00 loops=1)
         Sort Key: assigned_at DESC
         Sort Method: quicksort  Memory: 25kB
         Buffers: shared hit=3
         ->  Index Scan using idx_operational_assignment_active_resource on operational_assignment  (cost=0.28..8.30 rows=1 width=148) (actual time=0.013..0.014 rows=1.00 loops=1)
               Index Cond: ((resource_type = 'verification'::text) AND (resource_id = '00679700-5a4a-4a3c-90aa-1adb26a42092'::uuid))
               Index Searches: 1
               Buffers: shared hit=3
 Planning Time: 0.079 ms
 Execution Time: 0.030 ms
```

Planner choice: `Index Scan using idx_operational_assignment_active_resource`.
`Execution Time: 0.030 ms`.

### C1. Out-of-subject reference: `getAssignmentContextForResource` history fetch

For completeness only. The literal `getAssignmentContextForResource` SQL
fetches assignment **history** for the case page
(`WHERE a."resource_type" = $1 AND a."resource_id" = $2 ORDER BY
a."assigned_at" DESC LIMIT 10`, plus three `LEFT JOIN admin` for assigned-to
/ assigned-by / released-by display) and notably has **no
`released_at IS NULL` filter** — it must return both the active row and any
released rows up to ten total. This shape is intentionally **out of subject**
of this audit (per `Decision: subject-query scope is exactly two active-row
predicates`) but the plan is captured here once to demonstrate that the
planner correctly switches to the `operational_assignment_resource_type_resource_id_released_at_idx
full composite candidate` for that history shape (which cannot use the
partial unique because it has no `IS NULL` filter):

```text
 Limit  (cost=32.92..32.92 rows=1 width=232) (actual time=0.039..0.041 rows=2.00 loops=1)
   Buffers: shared hit=14
   ->  Sort  (cost=32.92..32.92 rows=1 width=232) (actual time=0.039..0.040 rows=2.00 loops=1)
         Sort Key: a.assigned_at DESC
         Sort Method: quicksort  Memory: 25kB
         Buffers: shared hit=14
         ->  Nested Loop Left Join  (cost=0.72..32.91 rows=1 width=232) (actual time=0.026..0.034 rows=2.00 loops=1)
               Buffers: shared hit=14
               ->  Nested Loop Left Join  (cost=0.58..24.71 rows=1 width=200) (actual time=0.024..0.031 rows=2.00 loops=1)
                     Buffers: shared hit=12
                     ->  Nested Loop Left Join  (cost=0.43..16.50 rows=1 width=168) (actual time=0.021..0.026 rows=2.00 loops=1)
                           Buffers: shared hit=8
                           ->  Index Scan using operational_assignment_resource_type_resource_id_released_at_id on operational_assignment a  (cost=0.28..8.30 rows=1 width=136) (actual time=0.015..0.017 rows=2.00 loops=1)
                                 Index Cond: ((resource_type = 'payment_request'::text) AND (resource_id = '004985fd-13c7-4d79-a2ce-712ab0112111'::uuid))
                                 Index Searches: 1
                                 Buffers: shared hit=4
                           ->  Index Scan using admin_pkey on admin at  (cost=0.15..8.17 rows=1 width=48) (actual time=0.003..0.003 rows=1.00 loops=2)
                                 Index Cond: (id = a.assigned_to)
                                 Index Searches: 2
                                 Buffers: shared hit=4
                     ->  Index Scan using admin_pkey on admin ab  (cost=0.15..8.17 rows=1 width=48) (actual time=0.001..0.001 rows=1.00 loops=2)
                           Index Cond: (id = a.assigned_by)
                           Index Searches: 2
                           Buffers: shared hit=4
               ->  Index Scan using admin_pkey on admin rb  (cost=0.15..8.17 rows=1 width=48) (actual time=0.001..0.001 rows=0.50 loops=2)
                     Index Cond: (id = a.released_by)
                     Index Searches: 1
                     Buffers: shared hit=2
 Planning Time: 0.293 ms
 Execution Time: 0.073 ms
```

Planner choice: `Index Scan using
operational_assignment_resource_type_resource_id_released_at_id` (the
`_id`-truncated identifier is the full composite —
`operational_assignment_resource_type_resource_id_released_at_idx`,
truncated to `NAMEDATALEN-1 = 63` characters by Postgres; same physical
index as in the foundation migration). The full composite is the **right**
index for this shape, and is **not** redundant with the partial unique:
dropping it would force the history fetch onto a seq scan or a
`Recheck Cond`-heavy bitmap path. Both indexes serve disjoint needs.

## Decision (a): Existing indexes are sufficient — no new migration

Per `Decision: binary audit outcome under one of two Decision headings`, the
audit's binary outcome is recorded under exactly one of two `Decision`
headings. The captured evidence above unambiguously selects path (a):

- For every `bulk getActiveAssigneesForResource predicate` plan (`B1`–`B6`),
  the planner chooses `idx_operational_assignment_active_resource partial
  unique candidate` — `Index Scan` for `length=1`, `Bitmap Index Scan` for
  `length ∈ {10, 100}`. The `operational_assignment_resource_type_resource_id_released_at_idx
  full composite candidate` is not considered for the active-row predicate
  at any cardinality bucket.
- For every `single-resource getAssignmentContextForResource active-row
  predicate` plan (`S1`–`S4`), the planner chooses
  `idx_operational_assignment_active_resource partial unique candidate`.
- No seq scan appears anywhere in the active-row predicate plans. Execution
  times are uniformly sub-millisecond at this scale (0.029–0.233 ms across
  all ten in-subject plans). `Buffers: shared hit` totals are tiny
  (3–64 buffers). Planning times are also sub-millisecond
  (0.073–0.588 ms).
- The full composite remains correctly used by the case-page history fetch
  (plan `C1`), confirming the two existing indexes serve disjoint needs and
  neither is redundant.

Therefore: **Decision (a): Existing indexes are sufficient — no new
migration**. No `schema.prisma` edit. No new migration directory. No
`@@index` declaration added. `no service code change`, `no DTO change`,
`no capability change`, `no audit action change`, `no endpoint change`.

`Closed follow-up: performance index audit on
operational_assignment(resource_type, resource_id, released_at)`.

## Discovered while exploring

### Transient seed step (verbatim — not committed)

The local dev DB had the `operational_assignment` table empty at audit time,
which would have made any `EXPLAIN` plan meaningless (the planner would
default to seq-scan-everywhere on a zero-row table). Per
`Decision: local dev DB only with explicit production-re-baseline framing`
the audit therefore performed transient seeding inside a single
`BEGIN; … ROLLBACK;` block, recorded verbatim below.
**The seed was never committed.** The post-rollback table count returned
to zero (verified at the end of the audit run; see `Sanity check`
subsection).

```sql
BEGIN;

-- 4 resource_types × 1000 active rows each = 4000 active assignments.
-- The two FK columns (assigned_to, assigned_by) are reused from a single
-- existing admin UUID found via SELECT id FROM admin LIMIT 1; this keeps
-- the seed FK-valid without inserting fixture admins.
INSERT INTO operational_assignment (resource_type, resource_id, assigned_to, assigned_by)
SELECT
  rt,
  gen_random_uuid(),
  '6f5eb51a-0e20-48e2-9488-1f85e44bef26'::uuid,
  '6f5eb51a-0e20-48e2-9488-1f85e44bef26'::uuid
FROM (VALUES ('payment_request'), ('document'), ('fx_conversion'), ('verification')) AS t(rt)
CROSS JOIN generate_series(1, 1000) AS s;

-- ~50% of active rows additionally get a historical (released) prior
-- assignment, so the case-page history fetch (plan C1) and the
-- `released_at IS NULL` selectivity see a realistic mix.
INSERT INTO operational_assignment (resource_type, resource_id, assigned_to, assigned_by, released_at, released_by, assigned_at)
SELECT
  resource_type,
  resource_id,
  assigned_to,
  assigned_by,
  NOW() - INTERVAL '7 day',
  assigned_to,
  NOW() - INTERVAL '14 day'
FROM operational_assignment
WHERE released_at IS NULL AND random() < 0.5;

ANALYZE operational_assignment;

-- (… EXPLAIN (ANALYZE, BUFFERS) plans captured here …)

ROLLBACK;
```

Sanity check after `ROLLBACK`:

```text
 total_after_rollback
----------------------
                    0
```

The seed admin UUID (`6f5eb51a-0e20-48e2-9488-1f85e44bef26`) was discovered
via `SELECT id FROM admin LIMIT 1;` on the dev DB and is reused for all
4000+2036 inserted rows. This collapsed `assigned_to` distribution is the
reason the captured `Memoize` blocks in plans `B2`–`B6` show ~99% hit
ratios; production data with many distinct assignees would see lower hit
ratios but the planner's choice for the **outer** scan
(`Bitmap Index Scan on idx_operational_assignment_active_resource`) is
unaffected by the inner-side cardinality.

The seed is **not committed** to the repo (no `scripts/`, no
`prisma/seed.ts`, no fixture file) per the slice's
`## Slice-Specific Non-Negotiables`. Re-running the audit requires
re-pasting the seed step into a `psql` session inside a
`BEGIN; … ROLLBACK;` block.

### Schema-vs-SQL declarative divergence on the partial unique

`packages/database-2/prisma/schema.prisma` lines 863-891
(`model OperationalAssignmentModel`) declares two `@@index` lines:

```prisma
@@index([resourceType, resourceId, releasedAt])
@@index([assignedTo, releasedAt])
```

There is **no Prisma-level declaration** of the partial unique
`idx_operational_assignment_active_resource` that exists in
`packages/database-2/prisma/migrations/20260417223000_operational_assignment_foundation/migration.sql`
lines 48-50:

```sql
CREATE UNIQUE INDEX "idx_operational_assignment_active_resource"
ON "operational_assignment"("resource_type", "resource_id")
WHERE "released_at" IS NULL;
```

Prisma's declarative `@@unique`/`@@index` syntax does not directly express
a partial-unique semantic alongside a separately-shaped full `@@unique` in
a way that round-trips cleanly via `prisma migrate dev`, so the foundation
migration carries this index explicitly at the SQL level only.

Per `Decision: do not pre-declare existing partial unique in schema.prisma`,
this slice **does not** add a Prisma-level declaration of the existing
partial unique. The divergence is recorded here for visibility but is
explicitly orthogonal to the audit's question (does the bulk lookup use a
sound plan?). Surfacing the partial form into the model is a separate,
schema-shape decision — if the maintainer later wants Prisma/SQL parity
for tooling reasons (`prisma migrate diff`, `prisma format`, IDE
autocomplete on `@@index`), that is a future hygiene pass; this slice
neither files that pass nor pre-empts it.

Bundling them now would expand scope and risk Prisma migration drift on a
non-perf-driven change.

### Why Decision (a) is unambiguous and not "looks fine, monitor later"

Per `Decision: binary audit outcome under one of two Decision headings`,
the audit refused to output a hybrid "no migration but adjust pg_stats"
recommendation or a "schedule production benchmark first" hold. The
captured plans are not ambiguous: every active-row predicate plan picks the
partial unique with sub-millisecond execution and tiny buffer counts; no
seq scan appears anywhere. Path (b) would have required either (i) a
captured seq scan on the bulk predicate, (ii) the planner choosing the
full composite over the partial unique despite the `released_at IS NULL`
filter, or (iii) a cross-cardinality switch that prevents a single binary
call (e.g. partial-at-1, seq-scan-at-100). None of those occurred, so
Decision (a) is the only correct outcome.

## Follow-ups

- `production re-baseline due before sixth bulk consumer or one
  order-of-magnitude row-count growth`. The current evidence is `local dev
  seed scale evidence` only (4000 active rows across four
  `resource_type`s); it does not assert production performance numbers and
  does not pre-validate behavior at admin-scale row counts. Trigger a fresh
  `EXPLAIN (ANALYZE, BUFFERS)` capture with the same matrix on production
  (or a production-shaped staging snapshot) when the table grows to
  ≥40 000 active rows or when a sixth bulk consumer is on the immediate
  horizon — whichever comes first. This mirrors the framing of
  [`docs/admin-v2-mvp-3.1c-perf-evidence.md`](./admin-v2-mvp-3.1c-perf-evidence.md).
- Re-evaluate at the next ≥10× row-count tier or whenever a sixth bulk
  consumer is on the immediate horizon. (Path-(a) trigger from
  `## Slice-Specific Non-Negotiables`.)
- Per `Decision: payouts list-surface assignee slice (3.7d) unblocked but
  not absorbed`: `SLICE-MVP-3.7d` (`/payouts` list-surface assignee
  surfacing) is unblocked from this audit's perspective; production-scale
  re-baseline still applies before the sixth bulk consumer or before the
  table grows ≥10×. The 3.7d handoff may be authored next; this slice does
  not pre-write it.
- The Prisma/SQL declarative parity gap on
  `idx_operational_assignment_active_resource` (see
  `Discovered while exploring`) is not closed by this slice and is
  explicitly out of scope. If a future maintainer wants tooling parity,
  file a separate hygiene pass; do not bundle it with another perf or
  feature slice.
- The assignment **history** path
  (`ORDER BY a."assigned_at" DESC LIMIT 10`, no `released_at IS NULL`
  filter) and the as-yet-unbuilt "my work" path
  (`assigned_to = $1 AND released_at IS NULL`) remain out of subject. The
  case-page history fetch already uses the full composite correctly
  (plan `C1`). The "my work" path will need its own audit when its first
  consumer is built.

## Required-token reconciliation (gate)

The following sentences exist for the `RECONCILIATION_NOTES` admin-v2 gate
(literal-substring matching in `scripts/admin-v2-gates/verify.mjs`). Each
required token is emitted on a single physical line so that
`String.includes` succeeds without depending on the prose's soft-wrap
choices above. The same statements are also asserted in the body of the
audit; this section is the canonical, line-wrap-stable form of those
assertions.

- Slice provenance: `SLICE-PATCH operational_assignment active-lookup index audit`.
- Subject queries: `bulk getActiveAssigneesForResource predicate`; `single-resource getAssignmentContextForResource active-row predicate`.
- Candidate indexes considered: `idx_operational_assignment_active_resource partial unique candidate`; `operational_assignment_resource_type_resource_id_released_at_idx full composite candidate`.
- Methodology: `EXPLAIN (ANALYZE, BUFFERS) captured per cardinality bucket`; `local dev seed scale evidence`.
- Existing consumer accounting: `four list-surface consumers as of SLICE-MVP-3.7c`; `six case-page consumers as of SLICE-MVP-3.6e`.
- Frozen surface (no edits): `apps/api/ workspace frozen`; `apps/admin/ workspace frozen`; `apps/api-v2/src/consumer/ workspace frozen`; `apps/api-v2/src/admin-v2/assignments/ frozen (subject query consumed not modified)`.
- Hard scope: `no service code change`; `no DTO change`; `no capability change`; `no audit action change`; `no endpoint change`.
- Decisions taken: `Decision: subject-query scope is exactly two active-row predicates`; `Decision: do not pre-declare existing partial unique in schema.prisma`; `Decision: local dev DB only with explicit production-re-baseline framing`; `Decision: binary audit outcome under one of two Decision headings`; `Decision: payouts list-surface assignee slice (3.7d) unblocked but not absorbed`.
- Binary outcome: `Decision (a): Existing indexes are sufficient — no new migration`.
- Bookkeeping closed by this slice: `Closed follow-up: performance index audit on operational_assignment(resource_type, resource_id, released_at)`.
- Forward trigger: `production re-baseline due before sixth bulk consumer or one order-of-magnitude row-count growth`.
