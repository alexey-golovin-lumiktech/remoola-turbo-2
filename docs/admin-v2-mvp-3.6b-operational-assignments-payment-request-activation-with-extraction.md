# Slice MVP-3.6b — Operational assignments activation for `payment_request` resourceType (with extraction)

## Slice scope

This slice (MVP-3.6b) is a strictly additive **operational assignments payment_request activation**
that simultaneously closes the deferred extraction follow-up from MVP-3.6a:

- `ASSIGNABLE_RESOURCE_TYPES extension`: `ASSIGNABLE_RESOURCE_TYPES` in
  `apps/api-v2/src/admin-v2/assignments/admin-v2-assignments.dto.ts` widened from
  `['verification', 'ledger_entry']` to
  `['verification', 'ledger_entry', 'payment_request']`. With this single
  TypeScript-constant change, `'payment_request' resourceType activated` end-to-end on the
  existing assignments surface.
- `shared backend helper getAssignmentContextForResource`: `AdminV2AssignmentsService` now exposes
  the public read-only method
  `getAssignmentContextForResource(resourceType: AssignableResourceType, resourceId: string)`,
  returning the same `{ current, history }` shape that was previously assembled by inline
  duplicates in `AdminV2VerificationService` and `AdminV2LedgerService`. The exported
  `AssignmentSummaryRow`, `AdminRef`, `mapAdminRef`, `AssignmentContextSummary`,
  `AssignmentContextHistoryItem`, and `AssignmentContext` types live in the same module so all
  consumers share one contract.
- `AdminV2VerificationService` and `AdminV2LedgerService` are refactored to depend on
  `AdminV2AssignmentsService` and call the shared helper instead of running their own private
  `getAssignmentContext` queries. The local `AssignmentSummaryRow` / `AdminRef` / `mapAdminRef`
  copies are removed from both services. Constructor signatures of both services gain
  `private readonly assignmentsService: AdminV2AssignmentsService` as a new dependency, and the
  respective NestJS modules import `AdminV2AssignmentsModule`.
- `AdminV2PaymentsService` is extended along the same shape: it now injects
  `AdminV2AssignmentsService`, and `getPaymentRequestCase` returns
  `assignment: { current, history }` populated by the shared helper, fetched concurrently with
  `auditContext`.
- Extended the BFF type `PaymentCaseResponse` in `apps/admin-v2/src/lib/admin-api.server.ts`
  with the same `assignment` shape, forward-referencing the existing exported `AssignmentSummary`
  and `AssignmentHistoryItem` types.
- Added three exported server actions and one private revalidate helper in
  `apps/admin-v2/src/lib/admin-mutations.server.ts`:
  `claimPaymentRequestAssignmentAction`, `releasePaymentRequestAssignmentAction`,
  `reassignPaymentRequestAssignmentAction`, plus `revalidatePaymentRequestAssignmentPaths`. They
  proxy through `postAdminMutation` to the existing endpoints with `resourceType:
'payment_request'`.
- `shared frontend AssignmentCard component`: extracted the inline ≈106-line Assignments-card
  JSX into a single shared server component at
  `apps/admin-v2/src/components/assignment-card.tsx`. The component accepts a typed
  `actions: { claim, release, reassign }` triple plus `capabilities`, `assignment`, and
  `reassignCandidates`, and binds the supplied actions to the `resourceId` for `<form action>`.
- `verification page refactored to AssignmentCard`: the verification case page consumes the
  shared component instead of its inline JSX block; capability calculation and reassign-candidate
  fetching are unchanged so the rendered surface remains byte-equivalent for users.
- `ledger page refactored to AssignmentCard`: same refactor for the ledger entry case page.
- `assignment context on /payments/[paymentRequestId] case page`: the payments case page now
  derives capability flags from `getAdminIdentity()` and renders the shared `<AssignmentCard>`
  between the related-ledger-entries grid and the timeline/audit-context grid.
- Hard rules upheld: `no new prisma migrations`, `no new capability`, `no new audit action`,
  `no new endpoint`. The slice is `reuse assignments.manage` for capability,
  `reuse assignment_claim` / `reuse assignment_release` / `reuse assignment_reassign` for audit
  vocabulary (per-row metadata simply carries `resource: 'payment_request'`), and
  `reuse POST /admin-v2/assignments/{claim,release,reassign}` for endpoint surface.
- `payments list page unchanged`, `payments operations page unchanged` — the new card lives only
  on the payment-request case page (mirroring the 3.6a anomalies-list / ledger-list deferral).
- `apps/api/ workspace frozen`, `apps/admin/ workspace frozen`, and
  `apps/api-v2/src/consumer/ frozen` for this slice.

## Files touched

- `apps/api-v2/src/admin-v2/assignments/admin-v2-assignments.dto.ts` — added `'payment_request'`
  literal to the `ASSIGNABLE_RESOURCE_TYPES` tuple. One-line additive change.
- `apps/api-v2/src/admin-v2/assignments/admin-v2-assignments.service.ts` — exported the
  `AssignmentSummaryRow`, `AdminRef`, `mapAdminRef`, `AssignmentContextSummary`,
  `AssignmentContextHistoryItem`, and `AssignmentContext` types and added the public
  `getAssignmentContextForResource` method that all per-resource services now call.
- `apps/api-v2/src/admin-v2/assignments/admin-v2-assignments.service.spec.ts` — added positive
  unit tests for `claim` against `'payment_request'` and dedicated tests for
  `getAssignmentContextForResource` (active, history-only, and no-rows scenarios). The previous
  "rejects unknown resourceType" test now uses `'payout'` as the still-unallowlisted sentinel.
- `apps/api-v2/src/admin-v2/verification/admin-v2-verification.service.ts` — removed the local
  `getAssignmentContext`, `AssignmentSummaryRow`, `AdminRef`, and `mapAdminRef` copies; injected
  `AdminV2AssignmentsService`; replaced the call site with
  `assignmentsService.getAssignmentContextForResource('verification', consumerId)`.
- `apps/api-v2/src/admin-v2/verification/admin-v2-verification.module.ts` — additive
  `AdminV2AssignmentsModule` import.
- `apps/api-v2/src/admin-v2/verification/admin-v2-verification.service.spec.ts` — extended every
  `new AdminV2VerificationService(...)` instantiation with the assignments-service mock, and
  refactored the assignment-context test to mock `getAssignmentContextForResource` instead of
  `$queryRaw`.
- `apps/api-v2/src/admin-v2/ledger/admin-v2-ledger.service.ts` — same cleanup as verification:
  removed local `getAssignmentContext` and friends, injected `AdminV2AssignmentsService`,
  replaced the call site with
  `assignmentsService.getAssignmentContextForResource('ledger_entry', entry.id)`.
- `apps/api-v2/src/admin-v2/ledger/admin-v2-ledger.module.ts` — additive
  `AdminV2AssignmentsModule` import.
- `apps/api-v2/src/admin-v2/ledger/admin-v2-ledger.service.spec.ts` — extended every
  `new AdminV2LedgerService(...)` instantiation with the assignments-service mock, and
  refactored the `buildLedgerServiceWithAssignmentRows` helper to feed the shared helper instead
  of `$queryRaw`.
- `apps/api-v2/src/admin-v2/payments/admin-v2-payments.service.ts` — injected
  `AdminV2AssignmentsService`; `getPaymentRequestCase` now fetches `auditContext` and
  `assignment` concurrently via `Promise.all` and returns the new field on
  `PaymentCaseResponse`.
- `apps/api-v2/src/admin-v2/payments/admin-v2-payments.module.ts` — additive
  `AdminV2AssignmentsModule` import.
- `apps/api-v2/src/admin-v2/payments/admin-v2-payments.service.spec.ts` — extended every
  `new AdminV2PaymentsService(...)` instantiation with the assignments-service mock and added a
  dedicated `payment_request` assignment-context test that mocks
  `getAssignmentContextForResource` on the injected `assignmentsService`.
- `apps/admin-v2/src/lib/admin-api.server.ts` — extended `PaymentCaseResponse` with
  `assignment: { current: AssignmentSummary | null; history: AssignmentHistoryItem[] }`.
- `apps/admin-v2/src/lib/admin-mutations.server.ts` — appended the three new server actions and
  the private `revalidatePaymentRequestAssignmentPaths` helper after the ledger block; no new
  imports.
- `apps/admin-v2/src/components/assignment-card.tsx` — new shared server component. Renders the
  Assignment panel, claim / release / reassign forms, and history disclosure that previously
  lived inline on the verification and ledger case pages.
- `apps/admin-v2/src/app/(shell)/verification/[consumerId]/page.tsx` — replaced the inline
  Assignment card JSX with `<AssignmentCard ... />`. Capability derivation,
  `reassignCandidates` filtering, and the rest of the page surface are unchanged.
- `apps/admin-v2/src/app/(shell)/ledger/[ledgerEntryId]/page.tsx` — replaced the inline
  Assignment card JSX with `<AssignmentCard ... />`. Capability derivation,
  `reassignCandidates` filtering, and the rest of the page surface are unchanged.
- `apps/admin-v2/src/app/(shell)/payments/[paymentRequestId]/page.tsx` — parallelized the page
  fetch with `getAdminIdentity()`, derived capability flags, fetched reassign candidates only
  when permitted, and inserted the shared `<AssignmentCard>` between the related-ledger-entries
  grid and the timeline/audit-context grid.
- `scripts/admin-v2-gates/config.mjs` — additive: `CHECK_PATHS` now references this
  reconciliation note and the new shared component file, `FRONTEND_ACTIONS` lists the three new
  payment-request server actions, and `RECONCILIATION_NOTES` carries the new top-level block
  enumerating the slice tokens.
- `docs/admin-v2-mvp-3.6b-operational-assignments-payment-request-activation-with-extraction.md`
  — this file.

## Decisions

- `Decision: payment_request over payout / fx_conversion / document resourceType`. Among the
  remaining values already enumerated by
  `operational_assignment_resource_type_check`, `payment_request` is the only one with a fully
  landed admin-v2 case page (`/payments/[paymentRequestId]`). `payout`, `fx_conversion`, and
  `document` either lack a case page entirely in admin-v2 or live behind workspaces that are
  still in skeleton form (3.3a/3.3b family). Activating `payment_request` exercises the full
  end-to-end surface (BFF type, server actions, page integration) while keeping the diff aligned
  with one resource only.
- `Decision: zero migration (DB CHECK already permits payment_request)`. The
  `operational_assignment_resource_type_check` constraint defined in
  `packages/database-2/prisma/migrations/20260417223000_operational_assignment_foundation/migration.sql`
  already enumerates `'payment_request'`. The unique partial index
  `idx_operational_assignment_active_resource` already enforces single-active per
  `(resource_type, resource_id)` for any value of `resource_type`. No migration is needed; an
  empty one would duplicate the existing CHECK.
- `Decision: shared helper extraction over inline copy`. The MVP-3.6a Known follow-up explicitly
  designated the third resource activation as the trigger for extraction. With three call sites
  now (verification, ledger, payments), the smallest-safe-diff principle flips: continuing to
  copy the SQL and the JSX would create three divergent surfaces. The extracted
  `getAssignmentContextForResource` keeps the SQL identical to the previous private copies
  (same `Prisma.sql` template, same `LIMIT 10`, same join/order semantics), and the extracted
  `<AssignmentCard>` keeps the JSX byte-equivalent to the verification/ledger originals so the
  rendered DOM does not change for users.
- `Decision: payments-list assignment column out of scope`. `AdminV2PaymentsService.list*`
  endpoints have their own SQL composition with cursor/pagination/filter implications, mirroring
  the 3.6a deferral on `ledgerList` and `ledgerAnomaliesList`. Adding a column there is a
  separate diff with its own perf and pagination story. Operators always navigate to the case
  page from the payment link anyway.
- `Decision: reuse assignment_* audit actions across resourceTypes`. Same as 3.6a. Per-row
  `resource_type` is already carried as metadata (`row.resource_type` flowed through to
  `audit.resource`) — that is the right place to discriminate by resource type, not the action
  constant. Adding `payment_assignment_claim` / etc. would double the vocabulary.
- `Decision: SUPER_ADMIN reassign requirement preserved`. The 3.2a §17.6 invariant
  ("`reassign` requires SUPER_ADMIN") remains in force through reuse: the frozen
  `AdminV2AssignmentsService.reassign` body still enforces it, and the new payments case page
  derives `canReassignAssignments = identity?.role === 'SUPER_ADMIN'`, matching the verification
  and ledger pages.
- `Decision: regulated decision controls preserved through reuse`. The verification case has a
  server-computed `decisionControls` object exposing `canManageAssignments` /
  `canReassignAssignments`. Per slice scope, neither the ledger-entry nor the payment-request
  case introduces an analogous field on its BFF response; the UI derives gating directly from
  `getAdminIdentity()` capabilities/role. The server endpoint remains the source of truth — UI
  flags only hide controls. This avoids widening the BFF contract solely for UI affordance and
  keeps all three cards on the same gating discipline.
- `Decision: F1 migration drift not absorbed`. The handoff-README "F1" follow-up
  (drift on `20260420163000_admin_v2_ledger_anomalies_indexes` and
  `20260420191500_admin_v2_duplicate_idempotency_risk_index`) is owned by the next slice that
  touches `packages/database-2/prisma/migrations/`. This slice does not touch that directory.

## Discovered while exploring

- The verification case page uses `verificationCase.decisionControls.canManageAssignments` /
  `canReassignAssignments` to gate its assignment controls, while the ledger-entry case page
  derives the same flags from `getAdminIdentity().capabilities` / `role`. Both routes converge
  on the same shared `<AssignmentCard>` because the component takes the boolean capabilities as
  props, not the source. The payment-request case page mirrors the ledger approach: identity-
  derived flags, no new BFF field, no `decisionControls` widening.
- `getAdminIdentity()` already exposes both `capabilities: string[]` and `role: string | null`
  in `apps/admin-v2/src/lib/admin-api.server.ts`, so the conservative-fallback branch (always
  rendering the form and relying on a 403) is again not needed for the payment-request page.
- The `payments/operations` route is a separate operational-assignments-overview page; it
  references the assignments family but is intentionally unchanged here. Adding payment-request
  visibility to that workspace, if useful, is a separate slice with its own scope.

## Tests baseline shift

- Backend `yarn test:admin-v2`:
  - `admin-v2-assignments.service.spec.ts` gains the `'payment_request'` claim test, three
    `getAssignmentContextForResource` cases (active, history-only, no-rows), and updates the
    "rejects unknown resourceType" sentinel from `'payment_request'` to `'payout'` because
    `'payment_request'` is now allowlisted.
  - `admin-v2-verification.service.spec.ts` and `admin-v2-ledger.service.spec.ts` switch their
    assignment-context coverage from `$queryRaw` mocking to mocking the injected
    `assignmentsService.getAssignmentContextForResource`. Existing positive cases retain the
    same assertions on `assignment.current` / `assignment.history`. Constructor mock-instances
    in every other test gain an empty `{} as never` for the new dependency to keep the suite
    green.
  - `admin-v2-payments.service.spec.ts` gains a dedicated `payment_request` assignment-context
    test, and every other `new AdminV2PaymentsService(...)` instantiation gains the empty
    assignments mock.
- No new e2e specs are required by the slice; the existing controller e2e coverage on
  `/admin-v2/assignments/*` already exercises the controller path. An optional
  `admin-v2-payment-request-assignments.e2e-spec.ts` is permitted but not gated.
- A standalone admin-v2 page test for `(shell)/payments/[paymentRequestId]/page.tsx` follows
  the same convention as 3.6a: not introduced in this slice. Page-level coverage rests on the
  backend service specs and on the existing integration of the verification-case behaviour
  through the shared component.

## Closed follow-ups

- `Closed follow-up: Assignments aggregation SQL duplication`. The 3.6a Known follow-up listed
  `getAssignmentContext` as duplicated inline in `admin-v2-verification.service.ts` and
  `admin-v2-ledger.service.ts`, with the Assignments-card JSX similarly duplicated in
  `(shell)/verification/[consumerId]/page.tsx` and `(shell)/ledger/[ledgerEntryId]/page.tsx`.
  Both backend duplicates are now replaced with calls to
  `AdminV2AssignmentsService.getAssignmentContextForResource`, and both frontend duplicates are
  replaced with `<AssignmentCard ... />` from `apps/admin-v2/src/components/assignment-card.tsx`.
  The new `payment_request` case-page consumer uses the same component and helper, so all three
  resource types now share one backend SQL path and one frontend rendering path.

## Known follow-ups

- F1 migration drift on `20260420163000_admin_v2_ledger_anomalies_indexes` and
  `20260420191500_admin_v2_duplicate_idempotency_risk_index` is still not absorbed by this slice
  (no migrations directory change). Ownership remains with the next slice that touches
  `packages/database-2/prisma/migrations/`.
- A standalone admin-v2 page test for `(shell)/payments/[paymentRequestId]/page.tsx` (covering
  the Assignment card capability gating end-to-end at the page level) is deferred to a future
  page-coverage slice. Until then, the page is covered by the backend service specs and by
  manual verification through `/payments/[paymentRequestId]`.
- `payments/operations` workspace integration of `payment_request` ownership signals (analogous
  to the 3.4a verification queue evaluator additions) is deliberately out of scope and remains
  open for a follow-up workspace slice.
