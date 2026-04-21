# MVP-3.4a Verification Workspace Completion (saved views + operational alerts expansion)

> Status: landed | Phase: post-MVP-3 (3.4a) | Sequence 6 (per 08-rollout-risks-and-sequencing.md, post-closure expansion) | Builds on: 3.3a, 3.3b

## Scope landed

- First post-MVP-3 expansion: верификационная queue полностью получает saved views + operational alerts через расширение existing skeleton'ов без переписывания. This is a verification_queue workspace activation: a workspace allowlist expansion landed via a single additive ALTER CHECK migration, with no new capability, no new audit action, and no new endpoint.
- One additive Prisma migration `20260421101000_admin_v2_verification_queue_workspace`, выполняющая два `ALTER TABLE ... DROP CONSTRAINT ... ADD CONSTRAINT` (на `saved_view` и `operational_alert`) в одной транзакции — расширение workspace allowlist на `('ledger_anomalies', 'verification_queue')`.
- `SAVED_VIEW_WORKSPACES` и `OPERATIONAL_ALERT_WORKSPACES` service constants синхронно расширены вторым value `'verification_queue'`.
- New evaluator strategy `VerificationQueueAlertEvaluator` (отдельный файл `admin-v2-operational-alerts-workspace-evaluators-verification.ts`) реализует тот же `OperationalAlertWorkspaceEvaluator` interface; зарегистрирована в `WorkspaceEvaluatorRegistry` рядом с `LedgerAnomaliesAlertEvaluator`. `satisfies` clause гарантирует exhaustiveness check на TypeScript уровне.
- One new public read-only method `AdminV2VerificationService.getQueueCount(filters)` — §15-blessed deviation в verification cluster (analog 3.3b §1.20 anomaly cluster `getCount`). Используется только evaluator strategy, не экспонирован через controller.
- `/verification` page интегрирует Saved views section с apply / save current view / inline rename / delete + graceful fallback при invalid payload + visible disclaimer о frontend-only filters несовместимости с alert evaluation.
- `AdminV2VerificationModule` уже экспортировал `AdminV2VerificationService` до этого slice'а (zero changes в verification module decorator); operational-alerts module добавил `AdminV2VerificationModule` в `imports`.
- `SavedViewWorkspace` и `OperationalAlertWorkspace` TypeScript types на frontend синхронно расширены.
- `revalidatePath` calls в `createSavedViewAction` / `updateSavedViewAction` / `deleteSavedViewAction` теперь учитывают `'verification_queue'` через `SAVED_VIEW_WORKSPACE_PATHS` map (workspace-aware revalidation, без double-revalidate).

## Explicitly out of slice

- Расширение allowlist на любые другие workspaces (payments, payouts, exchange, documents, consumers, ledger explorer, admins) — каждое требует отдельного slice'а с per-workspace UI integration.
- Новые threshold types за пределами `count_gt` — uniformity preserved.
- Новые limits / cron interval changes / evaluator budget tuning.
- New audit action names (workspace-aware metadata уже покрывает expansion).
- New capability splits (per-workspace или per-action) — single capability per domain pattern preserved.
- Operational alerts UI на `/verification` page (только optional minimal indicator не реализован — это была optional polishing задача в §7.3); основная alerts management остаётся на `/system/alerts`.
- Sharing / default / pin / favorite affordances для saved views.
- Schema migration для evolution на enum type or lookup table вместо CHECK constraint.
- Backfill / data migration на existing saved views / alerts (allowlist расширение superset, не переименование).
- Поддержка `missingProfileData` / `missingDocuments` в `getQueueCount` — frontend-only filters остаются frontend-only; alerts по такому payload падают с `last_evaluation_error`.
- Новые endpoints. Никаких controller правок.
- Новые DTO classes. Только два const расширены.
- Изменения в existing migrations (additive only).
- Изменения в `SavedViewModel` / `OperationalAlertModel` schema, services, controllers (frozen).
- Изменения в `LedgerAnomaliesAlertEvaluator` или `admin-v2-ledger-anomalies.service.ts` (anomaly cluster frozen).
- Изменения в verification mutation paths (approve/reject/request-info/flag) — read-only addition only.

## Decision: ALTER CHECK over rename strategy

- Migration выполняет `DROP CONSTRAINT` + `ADD CONSTRAINT` с тем же именем, не `CREATE CONSTRAINT` с новым именем + `DROP` старого.
- Альтернатива (rename strategy) сохраняла бы non-overlapping window между namespace, но требовала бы downstream consumers (e.g., monitoring queries по constraint name) обновления — лишний blast radius.
- DROP+ADD атомарен в transactional Prisma migrate context; window inconsistency = 0.

## Decision: getQueueCount excludes missingProfileData / missingDocuments

- В `getQueue` эти два фильтра вычисляются in-memory после fetch (через `hasMissingProfileData()` helper и `_count.consumerResources` comparison).
- Для count query это означало бы: (a) full scan + materialization вместо `count(*)` — нарушение pack §07 Risk 8 budget (500ms target), (b) дублирование `hasMissingProfileData` logic во второй place с risk drift.
- Альтернативы:
  - "Push fix into DB" (e.g., generated column + index) — non-trivial schema work, блокирующий этот slice; out of scope.
  - "Approximate count" (sample-based) — неприемлемо для alert thresholds (false negatives = missed escalations).
  - "Reject all payloads with these keys" — fail-loud behaviour evaluator-side. Выбран этот вариант.
- Operator UX impact: saved views с frontend-only filters работают для apply (URL navigation — frontend reads local state), но не работают для alert evaluation. Save form явно дисклеймит это.
- Long-term: если frontend-only filter combinations станут common alert basis, добавить generated column в отдельном slice'е.

## Decision: separate evaluator file per workspace

- `LedgerAnomaliesAlertEvaluator` живёт в `admin-v2-operational-alerts-workspace-evaluators.ts`; добавление `VerificationQueueAlertEvaluator` туда же создало бы рост этого файла линейно с workspace count.
- Отдельный файл `admin-v2-operational-alerts-workspace-evaluators-verification.ts`:
  - Минимизирует merge conflicts при параллельном развитии evaluator'ов разных workspaces.
  - Делает explicit, что каждый evaluator owns собственный parser + threshold dispatch.
  - Облегчает удаление evaluator (если workspace deprecated) — drop file + 3 lines в registry/module.
- Trade-off: shared interface/types остаются в исходном файле (evaluators-without-suffix); новые evaluators импортируют типы оттуда. Это acceptable — interfaces редко меняются, конкретные strategies — часто.

## Decision: shared single capability per domain preserved

- `saved_views.manage` / `alerts.manage` gates все workspaces uniformly. Новая workspace value не triggers new capability.
- Альтернатива (per-workspace capability) преждевременна: нет реальной role differentiation, кто управляет ledger_anomalies views но не verification views.
- Granularity escalation возможна в будущем без user-visible API breakage (capability split — backend refactor).

## Decision: workspace immutable post-create preserved

- 3.3a §17.11 фиксирует workspace immutable. Этот slice сохраняет invariant — никаких update endpoints для workspace field.
- Operator который сохранил view с неверным workspace (e.g., перепутал tab) = create new + soft-delete old; 30 секунд работы.
- Альтернатива (mutable workspace) требовала бы payload re-validation (новый workspace может ожидать другую payload shape) — payload opaque-contract это запрещает.

## §15 blessed deviation: verification cluster getQueueCount addition

- Pack §1.20 (3.3a/3.3b cluster freeze pattern) предполагает, что cluster owner модифицирует только evaluator strategy сам; добавление public method в cluster service — §15 trigger.
- `AdminV2VerificationService` не имел метода для возвращения plain count по filtered query (только paginated `getQueue` с `_count`, post-fetch filtering, SLA snapshot, assignment join, etc.). Reuse `getQueue` для count purpose невозможно: full result materialization, cost ≫ count(*).
- Strategy alternatives considered:
  - X (raw SQL via PrismaService inside evaluator): дублирует filter shape логику, нарушает single-source-of-truth.
  - Y (additive public `getQueueCount` in verification service): минимальная additive surface, mirror of `getQueue` WHERE shape, no audit/idempotency wiring (read-only).
  - Z (extract shared `filterBuilder` into helper): preferable long-term, но требует refactor existing `getQueue` → out of slice scope.
- Y selected. Method intentionally NOT exposed via controller — internal service-to-service call only. Capability check skipped (caller is internal evaluator, not external HTTP). Audit not recorded (read-only count, not audit-worthy).
- Documented as blessed deviation per 3.3b precedent. Future verification cluster slices may extract shared filter builder (Z); this slice stays minimal.

## Reconciles

- First post-MVP-3 expansion validates the workspace-allowlist evolution rule established in 3.3a §17.9 / 3.3b — additive ALTER CHECK + service const + UI integration is exactly the predicted shape.
- Pattern reusable for next workspaces (`payments_operations`, `payouts_queue`, etc.) without architectural surprises.
- Test baseline: 86 tests pass for `admin-v2/operational-alerts` (existing 49 + new 18 strategy spec + harness adjustment); 16 tests pass for `admin-v2/verification` (existing 5 + new 11 `getQueueCount` spec); 6 tests pass for `apps/admin-v2/src/app/(shell)/verification/page` (existing 1 + new 5 saved views section).
- Anomaly cluster (3.1a/b/c), assignment cluster (3.2a), saved-views skeleton (3.3a), alerts skeleton (3.3b), all UI surfaces beyond `/verification` — all untouched.
