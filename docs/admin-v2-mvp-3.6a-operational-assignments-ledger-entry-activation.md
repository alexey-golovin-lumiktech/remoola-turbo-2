# Slice MVP-3.6a — Operational assignments activation for `ledger_entry` resourceType

## Slice scope

This slice (MVP-3.6a) is a strictly additive **operational assignments ledger_entry activation**:

- `ASSIGNABLE_RESOURCE_TYPES extension`: `ASSIGNABLE_RESOURCE_TYPES` in
  `apps/api-v2/src/admin-v2/assignments/admin-v2-assignments.dto.ts` widened from
  `['verification']` to `['verification', 'ledger_entry']`. With this single TypeScript-constant
  change, `'ledger_entry' resourceType activated` end-to-end on the existing assignments surface.
- Extended `AdminV2LedgerService.getLedgerEntryCase` so the ledger-entry case payload now carries
  `assignment: { current, history }` derived from a private `getAssignmentContext(ledgerEntryId)`
  method that runs an `inline copy backend assignment-context query` mirroring the
  `AdminV2VerificationService.getAssignmentContext` pattern.
- Extended the BFF type `LedgerEntryCaseResponse` in
  `apps/admin-v2/src/lib/admin-api.server.ts` with the same `assignment` shape, forward-referencing
  the existing exported `AssignmentSummary` and `AssignmentHistoryItem` types.
- Added three exported server actions and one private revalidate helper in
  `apps/admin-v2/src/lib/admin-mutations.server.ts`:
  `claimLedgerEntryAssignmentAction`, `releaseLedgerEntryAssignmentAction`,
  `reassignLedgerEntryAssignmentAction`, plus `revalidateLedgerEntryAssignmentPaths`. They proxy
  through `postAdminMutation` to the existing endpoints with `resourceType: 'ledger_entry'`.
- Surfaced `assignment context on /ledger/[ledgerEntryId] case page` via an
  `inline copy UI Assignments card` (≈106 JSX lines mirroring the verification-case card) under
  `apps/admin-v2/src/app/(shell)/ledger/[ledgerEntryId]/page.tsx`.
- Hard rules upheld: `no new prisma migrations`, `no new capability`, `no new audit action`,
  `no new endpoint`. The slice is `reuse assignments.manage` for capability,
  `reuse assignment_claim` / `reuse assignment_release` / `reuse assignment_reassign` for audit
  vocabulary (per-row metadata simply carries `resource: 'ledger_entry'`), and
  `reuse POST /admin-v2/assignments/{claim,release,reassign}` for endpoint surface.
- `verification surface frozen`: `apps/admin-v2/src/app/(shell)/verification/`,
  `apps/api-v2/src/admin-v2/verification/`,
  `apps/api-v2/src/admin-v2/assignments/admin-v2-assignments.service.ts`, and
  `apps/api-v2/src/admin-v2/assignments/admin-v2-assignments.controller.ts` have zero changes.
  `anomalies list page unchanged` and `ledger list page unchanged` — the new card lives only on
  the entry case page.
- `apps/api/ workspace frozen`, `apps/admin/ workspace frozen`, and
  `apps/api-v2/src/consumer/ frozen` for this slice.

## Files touched

- `apps/api-v2/src/admin-v2/assignments/admin-v2-assignments.dto.ts` — added `'ledger_entry'`
  literal to the `ASSIGNABLE_RESOURCE_TYPES` tuple. One-line additive change.
- `apps/api-v2/src/admin-v2/assignments/admin-v2-assignments.service.spec.ts` — added positive
  unit tests for `claim`, `release`, and `reassign` against the new resource type, plus the
  audit-row `resource: 'ledger_entry'` assertion.
- `apps/api-v2/src/admin-v2/ledger/admin-v2-ledger.service.ts` — added private
  `getAssignmentContext(ledgerEntryId)` (inline copy of the verification-service pattern), local
  `AssignmentSummaryRow` / `AdminRef` types, and `mapAdminRef` helper. Wired the resulting
  `assignment` field into the `getLedgerEntryCase` return.
- `apps/api-v2/src/admin-v2/ledger/admin-v2-ledger.service.spec.ts` — added unit tests covering
  the new `assignment.current` / `assignment.history` shape (active and released rows).
- `apps/admin-v2/src/lib/admin-api.server.ts` — extended `LedgerEntryCaseResponse` with
  `assignment: { current: AssignmentSummary | null; history: AssignmentHistoryItem[] }`.
- `apps/admin-v2/src/lib/admin-mutations.server.ts` — appended the three new server actions and
  the private `revalidateLedgerEntryAssignmentPaths` helper after the verification block; no new
  imports.
- `apps/admin-v2/src/app/(shell)/ledger/[ledgerEntryId]/page.tsx` — parallelized the page fetch,
  added `describeAdmin` helper, derived capability flags from `getAdminIdentity()`, fetched
  reassign candidates only when permitted, and inserted the Assignment card section between the
  Related-ledger-chain grid and the Audit-context panel.
- `scripts/admin-v2-gates/config.mjs` — additive: `CHECK_PATHS` now references this reconciliation
  note, `FRONTEND_ACTIONS` lists the three new server actions, and `RECONCILIATION_NOTES` carries
  the new top-level block enumerating these tokens.
- `docs/admin-v2-mvp-3.6a-operational-assignments-ledger-entry-activation.md` — this file.

## Decisions

- `Decision: ledger_entry over ledger_anomaly resourceType`. A `ledger_anomaly` is a derived row
  with no canonical UUID identity; its `id` field is always `ledgerEntryId` (see
  `le.id AS "id", le.id AS "ledgerEntryId"` in `admin-v2-ledger-anomalies.service.ts`).
  `OperationalAssignmentModel.resource_id` is `UUID NOT NULL`, so keying on `'ledger_anomaly'`
  would require either a synthetic UUID per `(class, ledgerEntryId)` pair or overloading the
  column to hold the entry id anyway — both add vocabulary without operational value. Multiple
  anomaly classes touching the same entry collapse into one ownership thread, which matches how
  operators investigate.
- `Decision: zero migration (DB CHECK already permits ledger_entry)`. The
  `operational_assignment_resource_type_check` constraint defined in
  `packages/database-2/prisma/migrations/20260417223000_operational_assignment_foundation/migration.sql`
  already enumerates `'ledger_entry'`. The unique partial index
  `idx_operational_assignment_active_resource` already enforces single-active per
  `(resource_type, resource_id)` for any value of `resource_type`. Adding an empty migration
  would duplicate the existing CHECK or introduce a redundant index — neither needed; both would
  trip additive-first principle and gate noise.
- `Decision: inline copy over shared helper extraction`. `AdminV2VerificationService` already
  owns `getAssignmentContext` inline (≈70 lines, `admin-v2-verification.service.ts:280-353`).
  Extracting a shared `AdminV2AssignmentsService.getAssignmentContextForResource(resourceType,
  resourceId)` would force three concerns into this slice — (a) modifying the pure-mutation
  assignments service, (b) re-wiring the frozen verification service to consume it, (c) the
  activation itself. The smallest-safe-diff principle prefers activating cleanly, recording the
  duplication, and extracting at the third consumer when shape evidence is concrete. Same
  rationale applies to the UI Assignments card.
- `Decision: anomalies-list assignment column out of scope`. The closest read-only precedent is
  the verification-list "Assigned to" badge, which would require extending six distinct
  anomaly-class SQL paths in `AdminV2LedgerAnomaliesService` with a `LATERAL JOIN` to
  `operational_assignment`. The diff multiplies by six and risks regressing the landed perf
  envelope from 3.1b/3.1c. Operators always navigate to the case page from the anomaly link
  anyway.
- `Decision: ledger-list assignment column out of scope`. `AdminV2LedgerService.listLedgerEntries`
  has its own SQL composition with cursor/pagination/filter implications. Adding a column there
  is a separate diff with its own perf and pagination story. No precedent on the verification
  list for inline claim either.
- `Decision: reuse assignment_* audit actions across resourceTypes`. `assignment_claim`,
  `assignment_release`, and `assignment_reassign` are vocabulary keyed per action, not per
  resource. Per-row `resource_type` is already carried as metadata (`row.resource_type` flowed
  through to `audit.resource`) — that is the right place to discriminate by resource type, not
  the action constant. Adding `ledger_assignment_claim` / etc. would double the vocabulary, force
  a `CHECK_PATHS` and `AUDIT_ACTIONS` config update, and break the existing audit-search UX that
  already treats `assignment_*` as the canonical assignment family.
- `Decision: SUPER_ADMIN reassign requirement preserved`. The 3.2a §17.6 invariant
  ("`reassign` requires SUPER_ADMIN") remains in force through reuse: the frozen
  `AdminV2AssignmentsService.reassign` body still enforces it, and the new ledger-entry case page
  derives `canReassignAssignments = identity?.role === 'SUPER_ADMIN'`, matching the verification
  page's behaviour.
- `Decision: regulated decision controls preserved through reuse`. The verification case has a
  server-computed `decisionControls` object exposing `canManageAssignments` /
  `canReassignAssignments`. Per slice §11.19, the ledger-entry case does not introduce an
  analogous field on `LedgerEntryCaseResponse`; the UI derives gating directly from
  `getAdminIdentity()` capabilities/role. The server endpoint remains the source of truth — UI
  flags only hide controls. This avoids widening the BFF contract solely for UI affordance.
- `Decision: F1 migration drift not absorbed`. The handoff-README "F1" follow-up
  (drift on `20260420163000_admin_v2_ledger_anomalies_indexes` and
  `20260420191500_admin_v2_duplicate_idempotency_risk_index`) is owned by the next slice that
  touches `packages/database-2/prisma/migrations/`. This slice does not touch that directory, so
  the F1 ownership clause is not triggered.

## Discovered while exploring

- `getAdminIdentity()` in `apps/admin-v2/src/lib/admin-api.server.ts` already exposes both
  `capabilities: string[]` and `role: string | null`, so the conservative-fallback branch
  outlined in handoff §4.3 (always rendering the form and relying on a 403) was not needed. The
  ledger entry case page derives `canManageAssignments` from `identity.capabilities.includes
  ('assignments.manage')` and `canReassignAssignments` from `identity.role === 'SUPER_ADMIN'`,
  matching the verification page exactly.
- The slice's canonical pattern (verification case page) does not ship a `page.test.tsx` either,
  so to mirror landed convention the ledger entry case page also does not introduce a new test
  file in this slice. Page-level coverage rests on backend service specs (claim/release/reassign
  for `'ledger_entry'`, plus `getLedgerEntryCase` assignment-shape tests) and on the existing
  e2e suites that cover the assignments controller. A standalone admin-v2 page test for the
  ledger-entry case is left as a known UX-coverage gap, to land alongside the future shared-card
  extraction (see "Known follow-ups").

## Tests baseline shift

- Backend `yarn test:admin-v2` gained the `'ledger_entry'` claim/release/reassign cases in
  `admin-v2-assignments.service.spec.ts` and the assignment-shape cases in
  `admin-v2-ledger.service.spec.ts`. Net delta is in the +5–10 test range across two suites; no
  existing tests were modified. The verification suite is untouched.
- No new e2e specs are required by the slice; the existing controller e2e coverage on
  `/admin-v2/assignments/*` already exercises the controller path. An optional
  `admin-v2-ledger-entry-assignments.e2e-spec.ts` is permitted by §11.6 but is not gated.

## Known follow-ups

- `Known follow-up: Assignments aggregation SQL duplication`. `getAssignmentContext` is now
  copied inline in two services (`admin-v2-verification.service.ts` and
  `admin-v2-ledger.service.ts`). The same is true of the Assignments card JSX in two pages
  (`(shell)/verification/[consumerId]/page.tsx` and `(shell)/ledger/[ledgerEntryId]/page.tsx`).
  When a third resource type activates (3.6b/c/d), extract a shared helper in
  `AdminV2AssignmentsService` (`getAssignmentContextForResource(resourceType, resourceId)`) and
  a shared `<AssignmentCard>` component, then have all three consumers call them. Owner: third
  resource-type slice.
- F1 migration drift on `20260420163000_admin_v2_ledger_anomalies_indexes` and
  `20260420191500_admin_v2_duplicate_idempotency_risk_index` is not absorbed by this slice (no
  migrations directory change). Ownership remains with the next slice that touches
  `packages/database-2/prisma/migrations/`.
- A standalone admin-v2 page test for `(shell)/ledger/[ledgerEntryId]/page.tsx` (covering the
  Assignment card capability gating end-to-end at the page level) is deferred to the same
  shared-component slice that extracts `<AssignmentCard>`. Until then, the page is covered by
  the backend service specs and by manual verification through `/ledger/[ledgerEntryId]`.
