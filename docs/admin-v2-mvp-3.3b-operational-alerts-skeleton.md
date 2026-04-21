# MVP-3.3b Operational Alerts (skeleton, reconciliation note)

> Status: landed | Phase: MVP-3.3b | Sequence 7 (per 08-rollout-risks-and-sequencing.md) | Builds on: 3.3a

## Scope landed

- Closes the second (last) half of the MVP-3 exit criterion "saved views and operational alerts configurable".
- One new Prisma model OperationalAlertModel + one additive migration `20260421100500_admin_v2_operational_alerts_foundation` (followed `migration-safety` skill: additive-only, explicit CHECK constraints, FK with ON DELETE NO ACTION, partial unique index WHERE deleted_at IS NULL, no CONCURRENTLY).
- Single new capability `alerts.manage` (active for OPS_ADMIN and SUPER_ADMIN bridge — analogous to `saved_views.manage` personal accelerator capability; gates all four endpoints uniformly: list, create, update, delete; no per-channel or per-workspace capability split).
- Three new audit actions: `alert_create`, `alert_update`, `alert_delete`. No `alert_fire` / `alert_evaluation_failed` / `alert_acknowledged` / `alert_snoozed` — fire is a system event captured row-level via snapshot fields (see decision below).
- Three new server actions: `createOperationalAlertAction`, `updateOperationalAlertAction`, `deleteOperationalAlertAction`.
- Four new endpoints under `/api/admin-v2/operational-alerts/`: list, create, update, delete. All mutating endpoints require `Idempotency-Key`, are CSRF-protected globally, and use `expectedDeletedAtNull = 0` as the optimistic-concurrency proxy.
- single workspace allowlist value: `ledger_anomalies only`. Enforced at three layers (defense in depth): DB CHECK constraint, service constant `OPERATIONAL_ALERT_WORKSPACES`, and workspace evaluator strategy lookup with defensive fallback to `last_evaluation_error`.
- Single supported threshold type: `count_gt only` in this skeleton (`SUPPORTED_THRESHOLD_TYPES = ['count_gt']`); validated structurally by `assertValidThresholdPayload` (object shape, integer value 1..1_000_000, no extra keys, exhaustive future-proof check).
- Two payload columns per alert: `queryPayload` (opaque to backend, JSONB ≤4096 bytes — workspace handler owns the schema) and `thresholdPayload` (structured thresholdPayload, structured JSONB ≤1024 bytes — backend parses).
- personal-only ownership invariant: every read and mutation filtered by `owner_id = caller.adminId`. Non-owner access returns 404 (NOT 403) to avoid ownership leak. No SUPER_ADMIN override.
- soft-delete by default via `deleted_at TIMESTAMPTZ`; partial unique index `(owner_id, workspace, name) WHERE deleted_at IS NULL` allows reusing names after deletion.
- Row-level fired/evaluation snapshot fields: `last_fired_at`, `last_fire_reason`, `last_evaluated_at`, `last_evaluation_error` (each ≤500 chars on the textual sides via DB CHECK + service-level truncation).
- New scheduler `AdminV2OperationalAlertsEvaluatorService` with `@Cron('*/5 * * * *')` running under the existing `ScheduleModule.forRoot()` (mirrors the canonical reset-password-cleanup pattern).
- Bounded execution constants in the evaluator: `EVALUATOR_TICK_MAX_ALERTS = 100`, `EVALUATOR_PER_ALERT_TIMEOUT_MS = 10_000`, `EVALUATOR_TICK_WALL_BUDGET_MS = 240_000`. Per-alert error isolation (one failure never breaks the batch) and a top-level try/catch that protects the @Cron decorator from throwing.
- Workspace evaluator strategy pattern: `OperationalAlertWorkspaceEvaluator` interface + `LedgerAnomaliesAlertEvaluator` implementation. Strategy registry lives inside the evaluator service; payload-shape parsing is co-located with the strategy (workspace handler owns schema, backend service treats payload as opaque).
- Definition mutation (queryPayload / thresholdPayload / evaluationIntervalMinutes change) resets evaluation state to NULL on the same UPDATE statement; name/description-only updates do not touch evaluation state. Audit metadata records `evaluationStateReset` per update.
- New page `/system/alerts` with CRUD UI: list, FIRED badge for alerts fired within `evaluationIntervalMinutes * 2` window (with `lastFireReason` tooltip), `Last fired:` history label for older fires, evaluation error badge for `lastEvaluationError`, inline rename / threshold / interval form, and a create form.
- No changes to `/system/page.tsx`, `/overview/page.tsx`, `/ledger/anomalies/page.tsx` — the link from `/system/page.tsx` to `/system/alerts` is intentionally deferred to a follow-up additive slice (see decision below).

## Deviation from §1.20 anomaly cluster freeze

- §1.20 of the slice handoff froze `apps/api-v2/src/admin-v2/ledger/anomalies/*` with an explicit §15 escalation path for missing read-only dependencies.
- This slice triggered §15: `AdminV2LedgerAnomaliesService` had no public `getCount(className, dateFrom, dateTo)` method (only `getSummary` with per-class fixed windows and `getList` with paginated row hydration capped at `MAX_ANOMALY_LIMIT`).
- Resolution (blessed before implementation): added one additive read-only public method `AdminV2LedgerAnomaliesService.getCount(className, dateFrom, dateTo): Promise<number>` reusing the existing SQL filter shape of `getList` with `SELECT COUNT(*)` instead of row hydration. No changes to `getList`, `getSummary`, anomaly controller, DTO, capability gating, perf scripts, or `MAX_ANOMALY_LIMIT`. Anomaly service spec extended with minimal coverage (6-class happy, empty result, invalid range, cross-validation vs `getList`).
- Precedent: this is analogous to the 3.2a §6.3 anomaly cluster read-only addition (additive verification controller fields exposed for assignments). Both are additive, no behavior change to existing public surface.
- Future implication: any post-MVP-3 slice that adds new ledger anomaly classes MUST extend `getCount` coverage to those classes; `LedgerAnomaliesAlertEvaluator` depends on this contract.
- Workspace-evaluator-vs-domain-cluster boundary precedent: evaluators consume their domain cluster's public read-only methods via DI; they do NOT inline raw SQL or duplicate query semantics. This preserves single-source-of-truth for query shape while keeping the domain controller surface frozen.

## MVP-3 maturity track status: CLOSED — MVP-3 maturity track closed

After this slice lands, all MVP-3 exit criteria from `admin-v2-pack/08-rollout-risks-and-sequencing.md` are closed. Post-MVP-3 expansion candidates (saved views to other workspaces, operational alerts to other workspaces, additional threshold types, alert occurrence history, additional delivery channels, manual re-evaluate endpoint, alert ack/snooze, link from /system/page.tsx to /system/alerts, "Create alert from this filter" shortcut on /ledger/anomalies/page.tsx) all live in their own future slices.

## Explicitly out of slice

- `OperationalAlertOccurrenceModel` (history of firings) — deferred.
- `OperationalAlertSubscriptionModel` / `OperationalAlertChannelModel` / `OperationalAlertSnoozeModel` — deferred.
- Email / Slack / webhook / push delivery — deferred (in-app fired badge only).
- Manual re-evaluate-now endpoint — deferred.
- Ack / snooze / suppress actions — deferred.
- Workspaces other than `ledger_anomalies` — each is its own slice.
- Threshold types other than `count_gt` (`rate_change`, `z_score`, `percentile_above`, `compare_to_baseline`) — each is its own slice.
- Alert sharing / team alerts / super-admin override — deferred.
- "Create alert from this saved view" UX shortcut — deferred.
- Link from `/system/page.tsx` to `/system/alerts` — deferred to follow-up additive slice.
- queryPayload structural validation in shared service — opaque-from-backend invariant preserved; only the workspace evaluator parses.
- Multi-instance scheduler safety (pull-with-lock) — single-process @Cron sufficient; flagged as §15 escalation when multi-instance deploy lands.
- Audit on fire / evaluation events — captured row-level via snapshot fields; `admin_action_audit` reserved for admin actions.

## Decision: workspace allowlist ledger_anomalies only

- `ledger_anomalies` is the most mature read surface with a stable query shape that is also the workspace operators most often want to alert on.
- Allowlist enforced at three layers: PostgreSQL CHECK constraint on `operational_alert.workspace`, the service constant `OPERATIONAL_ALERT_WORKSPACES = ['ledger_anomalies']`, and the workspace evaluator strategy registry (defensive fallback writes `Unknown workspace evaluator: <ws>` into `last_evaluation_error` if a row somehow slips past both upstream layers).
- Allowlist evolution is intentionally an additive migration step (`ALTER ... DROP CONSTRAINT ... ADD CONSTRAINT ...`) PLUS a new `OperationalAlertWorkspaceEvaluator` strategy implementation PLUS a UI workspace dropdown extension. Three coordinated changes are intentional friction.

## Decision: separate query and threshold payloads

- `queryPayload` defines "what we observe" (filter combination — class, date range, etc.). Semantically identical to a saved view payload and remains opaque to backend (mirrors 3.3a `Decision: opaque queryPayload contract` evidence).
- `thresholdPayload` defines "when we fire" (count > N? rate change? z_score?). Backend MUST parse — the evaluator must compare observed value against threshold. Without structural validation the evaluator cannot execute.
- Merging into one column would either force backend to parse the entire payload (breaking opaque-from-backend invariant for the query region) or push threshold logic inside an opaque region (less clear boundary). Two columns make the contract explicit.

## Decision: threshold count_gt only

- `count_gt` is the simplest meaningful threshold and covers the majority of "alert me when X exceeds N" operator intent.
- Other types each require non-trivial design (`rate_change` needs window aggregation, `z_score` needs baseline series + rolling window, `percentile_above` needs distribution snapshot, `compare_to_baseline` needs baseline definition + tolerance). Each merits its own slice with its own evidence rationale.

## Decision: in-app delivery only

- Each delivery channel pulls in its own infrastructure assessment, secret management, template work, opt-in/opt-out semantics (per-admin per-channel preferences = new model), retry/dead-letter handling, rate-limiting, and delivery audit. Each is non-trivial and merits its own slice.
- In-app fired-state badge is sufficient for the skeleton — operator is already on the surface to manage alerts; pull-based notification works for the daily-revisit pattern. If operators don't open `/system/alerts` often enough, that is the signal to add a push channel.

## Decision: no occurrence model in skeleton

- An occurrence model would be high-cardinality time-series data requiring partition strategy, retention policy, cleanup scheduler, index strategy, and pagination on read endpoint — each a non-trivial design decision deserving its own evidence.
- `last_fired_at` answers the single immediate question: "is this alert firing now?" This is sufficient for the UI badge.
- Reassessment trigger: when the first operator asks "how many times did this alert fire over the last week?" — that is the signal for an occurrence-history slice.

## Decision: no audit on fire / evaluation

- `admin_action_audit` is semantically reserved for ADMIN actions (actor = admin, attributable). Fire is a system event (actor = scheduler, not human admin).
- Mixing system events into `admin_action_audit` would distort signal-to-noise for investigations, force null-actorId support, and create a precedent for unbounded scope (other system events would follow).
- Row-level snapshot fields (`last_fired_at`, `last_fire_reason`, `last_evaluated_at`, `last_evaluation_error`) precisely answer "what's the current state". Mutating admin actions (`alert_create` / `alert_update` / `alert_delete`) remain in `admin_action_audit` because they are actor-attributable.

## Decision: no confirmation on mutations

- Identical reasoning to 3.3a `Decision: name unique partial index` and the broader saved-views confirmation policy: personal data, reversible, non-financial, non-access-relevant.
- Even worst-case (delete by mistake) is recreate-in-30-seconds because the audit log retains the metadata + the form caches edits. A mistaken threshold change self-heals on the next evaluator tick.

## Decision: evaluation state reset on definition change

- If an operator changes the threshold from 5 to 50 (because 5 was noisy), and the alert is currently fired with reason `count=8 exceeded threshold=5`, the old reason becomes misleading for the new definition.
- Reset on `last_evaluated_at = NULL` ensures the alert is immediately picked up by the next evaluator tick (NULLS FIRST ordering). Reset on `last_fired_at` / `last_fire_reason` / `last_evaluation_error` is a clean slate for the new definition; the UI badge becomes "not fired (re-evaluating)" until the next tick writes fresh state.
- Selective: only reset when query / threshold / interval changes, not when name / description changes. A pure rename should not flicker the fired state.

## Decision: workspace immutable on update

- workspace = scope identifier, not attribute (mirrors 3.3a §17.11).
- Stronger argument for alerts: workspace determines which evaluator strategy runs. Cross-workspace mutation = "switch evaluator strategy mid-life" → old payload likely incompatible with new strategy → evaluator fails, alert stuck in error state.
- Defense in depth: the update DTO does not expose a `workspace` field; even if accidentally provided in the body it is ignored.

## Decision: no manual re-evaluate endpoint

- A manual re-evaluate endpoint would be a new regulated decision — its own idempotency scope, its own audit action (`alert_reevaluate`?), its own rate limit, and concurrency interaction with the scheduler tick (lock? skip? both run?).
- The 5-minute cron interval is sufficient latency for the personal alert management surface. If an operator wants immediate verification, they can temporarily lower `evaluationIntervalMinutes` to 1.
- Reassessment trigger: when operators complain that 5-minute latency blocks their workflow.

## Decision: workspace evaluator strategy boundary — workspace-evaluator-vs-domain-cluster boundary

- A single evaluator service knowing all workspace shapes is a god-class antipattern. Each workspace addition would require editing one large file → merge conflicts, broader test surface for every workspace change.
- Strategy pattern (`OperationalAlertWorkspaceEvaluator` interface + per-workspace implementation) scopes the blast radius of each workspace change to one file.
- `parseQueryPayload` lives inside the workspace strategy — this is the natural place where opaque-from-shared-backend payload becomes structured (workspace handler knows the schema). This is the same boundary 3.3a established for saved views, applied to alerts. It is also the boundary that justifies the §1.20 anomaly cluster read-only addition: evaluators consume domain cluster's public read-only methods via DI, never inlining SQL.

## Decision: defer link from system page

- Adding the link from `/system/page.tsx` to `/system/alerts` is a small additive change but it touches a frozen surface in this slice (§1.25). Bundling it with the foundation slice would dilute the rationale and broaden the diff.
- Splitting the link into a follow-up slice keeps this slice strictly focused on the foundation and preserves the "only the listed surfaces change" invariant.

## Concurrency contract

- `expectedDeletedAtNull = 0` in update / delete bodies acts as the optimistic-concurrency proxy ("expected deleted_at = null literal").
- Mutations open a `SELECT ... FOR UPDATE` on the row inside a transaction, verify ownership, verify `deleted_at IS NULL`, then apply the update. Any deviation returns 404 (not found / wrong owner) or 409 (already soft-deleted, name conflict).

## Idempotency

- All three mutation endpoints require Idempotency-Key header through `AdminV2IdempotencyService` with scopes `operational-alert-create`, `operational-alert-update`, `operational-alert-delete`.
- Replay with the same key returns the cached result; replay with a different payload returns 409 per the existing infra contract.
- The scheduler does NOT use idempotency — it is a system actor. Concurrency safety is provided by single-process @Cron + bounded LIMIT. Multi-instance deploy is flagged as §15 (pull-with-lock).

## Reconciles

- Closes the operational-alerts half of the last remaining MVP-3 exit criterion.
- Establishes new patterns: structured-payload validation (`assertValidThresholdPayload`), bounded scheduled evaluator (`EVALUATOR_TICK_MAX_ALERTS` / `EVALUATOR_PER_ALERT_TIMEOUT_MS` / `EVALUATOR_TICK_WALL_BUDGET_MS`), workspace evaluator strategy, row-level snapshot fields as the system-event audit substrate.
- Preserves the zero-mutation invariant of the anomaly cluster (3.1a/3.1b/3.1c) modulo the one blessed additive read-only `getCount` method, and leaves the saved views cluster (3.3a), assignment cluster (3.2a), verification, overview, and system controllers untouched.
- Establishes a precedent for future "system-level workspaces under /system/<name>" routing (next instance: any future system-level personal-data CRUD surface).
