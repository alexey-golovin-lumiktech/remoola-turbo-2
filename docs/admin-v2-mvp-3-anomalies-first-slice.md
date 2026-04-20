# MVP-3.1a Anomalies - First Maturity Slice (reconciliation note)

> Status: landed | Phase: MVP-3.1a | Sequence 6 (per 08-rollout-risks-and-sequencing.md)

## Scope landed

- first maturity slice for ledger anomalies across three classes: stalePendingEntries, inconsistentOutcomeChains, largeValueOutliers.
- Read-only surface: `GET /api/admin-v2/ledger/anomalies/summary`, `GET /api/admin-v2/ledger/anomalies`.
- Capability: `ledger.anomalies` (live).
- Overview signal `ledgerAnomalies` promoted from deferred to live-actionable.
- System workspace card for ledger anomalies added as a read-only health view.

## Explicitly out of slice

- orphanedEntries, duplicateIdempotencyRisk, impossibleTransitions - slice 1b.
- Acknowledge / dismiss / silence - slice 1c; no new audit actions in this slice.
- OperationalAlertModel, SavedViewModel - separate slices, not touched here.
- Background materialization / admin_overview_cache - not activated; temporarily-unavailable fallback remains the safe failure posture.

## Performance proof

- Query paths use single-roundtrip summary/list reads plus cursor pagination.
- Summary keeps `largeValueOutliers` bounded to the last 30 days.
- Real `EXPLAIN ANALYZE` evidence and p50/p95/p99 numbers (synthetic 50k entries / ~123k outcomes, PG 18.3) are now attached as the companion slice MVP-3.1b deliverable: see [docs/admin-v2-mvp-3.1b-perf-evidence.md](./admin-v2-mvp-3.1b-perf-evidence.md). Headline: `summaryEndpoint:promiseAll` p95 = 168 ms after the 3.1b index reshape, against the 500 ms budget — no class is shipped as `temporarily-unavailable`.

## Index strategy

- `ledger_entry(type, status)` - added via migration `20260420163000_admin_v2_ledger_anomalies_indexes` (kept additive; observed dormant against current query shapes — see migration README and 3.1b evidence doc).
- `ledger_entry(status, created_at)` - added via migration `20260420163000_admin_v2_ledger_anomalies_indexes` (kept additive; partial usage on `largeValueOutliers` summary scan only).
- `ledger_entry_outcome(ledger_entry_id, created_at desc)` - already in place since `20260225140000_ledger_entry_outcome_append_only` (kept as additive insurance after the 3.1b reshape).
- `ledger_entry_outcome(ledger_entry_id, created_at desc, id desc) INCLUDE (status)` - added via migration `20260420170000_admin_v2_anomalies_outcome_indexes` as part of slice MVP-3.1b. Closes the LATERAL pattern with an `Index Only Scan` (`Heap Fetches: 0`) for every anomaly count and list query.

## Finding: outcome→entry sync trigger absence

- Migration audit on `CREATE TRIGGER|CREATE OR REPLACE FUNCTION` across `packages/database-2/prisma/migrations/` returns no sync trigger touching `ledger_entry` / `ledger_entry_outcome`.
- Migration `20260225140000_ledger_entry_outcome_append_only/migration.sql` documents the actual model: outcomes are append-only; effective truth is derived via `COALESCE(latest outcome.status, ledger_entry.status)`; `ledger_entry.status` is a persisted convenience field updated by application code, not by a database trigger.
- The `schema.prisma` comment claiming a trigger syncs `ledger_entry.status` is documentation drift and stays outside this slice.
- `inconsistentOutcomeChains` therefore uses a persisted-status vs latest-outcome-status mismatch only after `INCONSISTENT_CHAIN_GRACE_MINUTES = 60`, which filters normal in-flight write races while surfacing real persistence drift.
- Open question, not a blocker: align the misleading schema comment in a separate doc-fix or model-correction PR.

## Decision: largeValueOutliers currency coverage

- CurrencyCode currently exposes 44 values.
- Slice 3.1a defines explicit USD-equivalent thresholds only for 11 major/reserve currencies: USD, EUR, GBP, CHF, CAD, AUD, NZD, SGD, HKD, JPY, CNY.
- All other 33 currencies are explicitly excluded from largeValueOutliers detection in this slice.
- Rationale: emerging-market and long-tail currency thresholds need observed operational baseline data; arbitrary defaults would either swamp the queue with false positives or hide real outliers.
- Thresholds stay code constants for now, not env tuning.

## Reconciles

- Closes the last deferred overview signal in the clean-shell maturity track.
- Keeps read-only anomaly review separate from ledger mutations and keeps no new audit actions out of scope.
- Preserves temporarily-unavailable behavior as the safe fallback contract when anomaly summary inputs are unreadable.
