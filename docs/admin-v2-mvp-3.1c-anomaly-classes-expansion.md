# MVP-3.1c Anomaly Classes Expansion (reconciliation note)

> Status: landed | Phase: MVP-3.1c | Sequence 6 (per 08-rollout-risks-and-sequencing.md) | Builds on: 3.1a, 3.1b

## Scope landed

- Six anomaly classes total: `stalePendingEntries`, `inconsistentOutcomeChains`, `largeValueOutliers` (from 3.1a) + `orphanedEntries`, `duplicateIdempotencyRisk`, `impossibleTransitions` (this slice).
- classes expansion through pure additions to `LEDGER_ANOMALY_CLASSES`; capability surface unchanged; controller endpoints unchanged.
- Read-only surface unchanged: `GET /api/admin-v2/ledger/anomalies/summary`, `GET /api/admin-v2/ledger/anomalies`.
- Capability `ledger.anomalies` still gates both endpoints uniformly.
- six classes are surfaced together in the overview signal and the system processingAnomalies card (runtime label: Ledger anomalies).

## Explicitly out of slice

- Acknowledge / dismiss / silence anomalies remain deferred; no `AnomalyAcknowledgmentModel` or persisted anomaly state was added.
- Snapshot/history materialization remains out of scope; `temporarily-unavailable` stays the safe fallback posture for true read failures.
- `OperationalAlertModel` and `SavedViewModel` remain separate slices.
- New mutations and no new audit actions: none were introduced by this slice.
- no new audit actions.

## Decision: orphanedEntries definition

- Schema facts from exploration:
  - `ledger_entry.consumer_id` is non-null and `onDelete: Cascade`, so orphan-by-deleted-consumer is physically impossible.
  - `ledger_entry.payment_request_id` is nullable and `onDelete: SetNull`, so a null request pointer after deletion is normal voided-request semantics, not an anomaly.
- Adopted definition: `ledger_entry` with no `LedgerEntryOutcomeModel` rows and created more than `ORPHANED_ENTRY_GRACE_HOURS` ago.
- Threshold: `ORPHANED_ENTRY_GRACE_HOURS = 1` (DTO constant, not env).
- Final SQL shape remains anti-join based (`NOT EXISTS` / `Hash Anti Join` equivalent); the EXPLAIN comparison and planner rationale are documented in `admin-v2-mvp-3.1c-perf-evidence.md`.

## Decision: duplicateIdempotencyRisk redefinition

- Schema constraint `@@unique([idempotencyKey])` means literal duplicate non-null idempotency keys are structurally rejected at the database layer.
- Adopted definition: `ledger_entry` where `idempotencyKey IS NULL` and `stripeId IS NOT NULL` inside the last 30 days.
- Time bound: `DUPLICATE_RISK_WINDOW_DAYS = 30`.
- API contract remains unchanged: `stripeId` is exposed only inside `signal.detail`, not as a new field on `LedgerAnomalyEntry`.
- Additive migration landed for the exact runtime shape:
  - `20260420191500_admin_v2_duplicate_idempotency_risk_index`
  - index name: `idx_ledger_entry_duplicate_idempotency_risk`
- Schema interpretation drift is noted for follow-up docs only; this slice does not rename the anomaly class.

## Decision: impossibleTransitions terminal-only scope

- `TransactionStatus` has no centralized state-machine declaration in the current codebase.
- Grep of `TERMINAL|FINAL_STATUS|isTerminal|terminalStatuses` returned only local/domain helpers, not a single approved source of truth.
- Adopted definition: any outcome chain where the previous status is inside `TERMINAL_OUTCOME_STATUSES = {COMPLETED, DENIED, UNCOLLECTIBLE}` and a later outcome exists.
- `TERMINAL_OUTCOME_STATUSES` is intentionally the narrowest non-opinionated invariant available.
- Broader "suspicious transition" detection remains out of scope until a real state machine is approved.

## Performance proof

- 3.1b baseline: `summaryEndpoint:promiseAll` p95 = 168 ms on the synthetic 50k-entry dataset documented in `admin-v2-mvp-3.1b-perf-evidence.md`.
- 3.1c six-class summary measurement: `summaryEndpoint:promiseAll` p95 = 296.75 ms, still well inside the 500 ms summary endpoint budget.
- The extended `scripts/admin-v2-anomalies-perf/measure.mjs` run now covers all six classes.
- `orphanedEntries` and `impossibleTransitions` still show planner-rational outer `Seq Scan` choices on synthetic data.
- `duplicateIdempotencyRisk` now uses the dedicated partial index from `20260420191500_admin_v2_duplicate_idempotency_risk_index`.
- Full EXPLAIN ANALYZE dumps and the Seq Scan justification table live in `docs/admin-v2-mvp-3.1c-perf-evidence.md`.

## Index strategy

- Existing additive indexes from 3.1a/3.1b remain in place:
  - `20260420163000_admin_v2_ledger_anomalies_indexes`
  - `20260420170000_admin_v2_anomalies_outcome_indexes`
- New additive migration in this slice:
  - `20260420191500_admin_v2_duplicate_idempotency_risk_index`
  - partial index `idx_ledger_entry_duplicate_idempotency_risk`
- No `CONCURRENTLY`, no schema.prisma change, no destructive index cleanup.
- `impossibleTransitions` inner LATERAL still uses `idx_ledger_entry_outcome_lateral_covering`; no §15 escalation remained open after the post-migration EXPLAIN confirmation.

## Reconciles

- Closes the 3.1a explicit out-of-slice backlog for `orphanedEntries`, `duplicateIdempotencyRisk`, and `impossibleTransitions` through a read-only classes expansion.
- Keeps `ledger.anomalies` as the only capability boundary for all six classes.
- Preserves controller/API shape, `temporarily-unavailable` fallback semantics, and the "no new audit actions" invariant.
- Builds directly on `admin-v2-mvp-3.1b-perf-evidence.md` rather than redefining 3.1a/3.1b decisions.
