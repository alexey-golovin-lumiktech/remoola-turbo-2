# Slice MVP-3.6c — Operational assignments activation for `payout` resourceType

## Slice scope

This slice (MVP-3.6c) is a strictly additive **operational assignments payout activation**
that consumes the shared infrastructure already extracted by MVP-3.6b (the public
`AdminV2AssignmentsService.getAssignmentContextForResource` helper and the shared
`<AssignmentCard>` server component). It is the fourth operational-assignments
multi-resource activation slice (after 3.2a `verification`, 3.6a `ledger_entry`, and
3.6b `payment_request`).

- `ASSIGNABLE_RESOURCE_TYPES extension`: `ASSIGNABLE_RESOURCE_TYPES` in
  `apps/api-v2/src/admin-v2/assignments/admin-v2-assignments.dto.ts` widened from
  `['verification', 'ledger_entry', 'payment_request']` to
  `['verification', 'ledger_entry', 'payment_request', 'payout']`. With this single
  TypeScript-constant change, `'payout' resourceType activated` end-to-end on the existing
  assignments surface.
- `reuse shared backend helper getAssignmentContextForResource`: `AdminV2PayoutsService`
  becomes the fourth consumer of the public read-only
  `AdminV2AssignmentsService.getAssignmentContextForResource(resourceType, resourceId)`
  helper that 3.6b extracted. No new helper is added; no helper is forked or copied.
- `AdminV2PayoutsService` is extended along the same shape as the 3.6b payments service:
  it now injects `AdminV2AssignmentsService`, and `getPayoutCase` returns
  `assignment: { current, history }` populated by the shared helper, fetched concurrently
  with `auditContext` via a single `Promise.all`.
- Extended the BFF type `PayoutCaseResponse` in `apps/admin-v2/src/lib/admin-api.server.ts`
  with the same `assignment` shape, forward-referencing the existing exported
  `AssignmentSummary` and `AssignmentHistoryItem` types. Placement mirrors the canonical
  `PaymentCaseResponse` ordering: immediately after `auditContext`, before
  `outcomeAgeHours`.
- Added three exported server actions and one private revalidate helper in
  `apps/admin-v2/src/lib/admin-mutations.server.ts`:
  `claimPayoutAssignmentAction`, `releasePayoutAssignmentAction`,
  `reassignPayoutAssignmentAction`, plus `revalidatePayoutAssignmentPaths`. They proxy
  through `postAdminMutation` to the existing endpoints with `resourceType: 'payout'`.
  The new block sits directly after the `payment_request` block and before
  `resetAdminPasswordAction`.
- `reuse shared frontend AssignmentCard component`: the payout case page consumes the
  shared `<AssignmentCard>` (extracted by 3.6b) without component changes. No new card
  component is introduced and no inline card JSX is copied.
- `assignment context on /payouts/[payoutId] case page`: the payouts case page now
  derives capability flags directly from `getAdminIdentity()` (`assignments.manage` for
  claim/release, `SUPER_ADMIN` role for reassign) and renders the shared
  `<AssignmentCard>` between the "Outcome timeline / Related ledger chain" detailGrid
  section and the "Audit context" panel section, per the §4.1 placement decision in the
  handoff. `getAdmins({ page: 1, pageSize: 50, status: 'ACTIVE' })` is fetched only when
  `canReassign === true` so the unprivileged case incurs no extra round-trip.
- Hard rules upheld: `no new prisma migrations`, `no new capability`,
  `no new audit action`, `no new endpoint`. The slice is `reuse assignments.manage` for
  capability, `reuse assignment_claim` / `reuse assignment_release` /
  `reuse assignment_reassign` for audit vocabulary (per-row metadata simply carries
  `resource: 'payout'`), and `reuse POST /admin-v2/assignments/{claim,release,reassign}`
  for endpoint surface.
- `payouts list page unchanged` — the new card lives only on the payout case page,
  mirroring the 3.6a (`anomalies-list` / `ledger-list`) and 3.6b (`payments-list` /
  `payments-operations`) deferrals. `(shell)/payouts/page.tsx` and
  `AdminV2PayoutsService.listPayouts` are untouched.
- `verification surface frozen`, `ledger surface frozen`, `payments surface frozen` —
  all three previously-activated case-page consumers and their backend services are
  untouched by this slice.
- `escalatePayoutAction frozen`, `revalidatePayoutPaths frozen`,
  `payoutEscalation flow frozen` — the existing payout escalation surface
  (`AdminV2PayoutsService.escalatePayout`, the `/admin-v2/payouts/:id/escalate`
  controller endpoint, the `payoutEscalation` field on `PayoutCaseResponse`, and the
  page-level escalation form / active-marker render) all remain byte-equivalent. The
  `assignment` field is `Decision: assignment orthogonal to payoutEscalation
  classification` — they may coexist on the same payout case without additional
  validation.
- `apps/api/ workspace frozen`, `apps/admin/ workspace frozen`, and
  `apps/api-v2/src/consumer/ frozen` for this slice.

## Files touched

- `apps/api-v2/src/admin-v2/assignments/admin-v2-assignments.dto.ts` — added `'payout'`
  literal to the `ASSIGNABLE_RESOURCE_TYPES` tuple. One-line additive change to the
  exported tuple.
- `apps/api-v2/src/admin-v2/assignments/admin-v2-assignments.service.spec.ts` — rotated
  the negative `claim` test literal from `'payout'` to `'fx_conversion'` (still in the
  DB CHECK list but no longer required to be the still-unallowlisted sentinel after
  this slice activates `'payout'`); added positive `'payout'` claim, release, and
  reassign tests mirroring the existing `payment_request` / `ledger_entry` patterns;
  added a positive `getAssignmentContextForResource('payout', ...)` shape test.
  +4 tests net.
- `apps/api-v2/src/admin-v2/payouts/admin-v2-payouts.service.ts` — additive
  `AdminV2AssignmentsService` import; constructor extended with
  `private readonly assignmentsService: AdminV2AssignmentsService` (third positional
  parameter, after `prisma` and `idempotency`). `getPayoutCase` now fetches
  `auditContext` and `assignment` concurrently via `Promise.all` and returns the new
  `assignment` field on the response shape. `listPayouts`, `escalatePayout`,
  `getPayoutOperationsSummary`, and all helper functions are unchanged.
- `apps/api-v2/src/admin-v2/payouts/admin-v2-payouts.module.ts` — additive
  `AdminV2AssignmentsModule` import in the NestJS `imports` array.
- `apps/api-v2/src/admin-v2/payouts/admin-v2-payouts.service.spec.ts` — extended
  `buildService()` to construct an `assignmentsService` mock (default
  `getAssignmentContextForResource → { current: null, history: [] }`) and pass it as the
  third constructor argument; existing `getPayoutCase` test asserts
  `payoutCase.assignment === { current: null, history: [] }`; new test asserts the
  helper is invoked with `('payout', payoutId)` and that the returned `current`/`history`
  populate `payoutCase.assignment` when the helper resolves to a non-null context.
  +1 test net.
- `apps/admin-v2/src/lib/admin-api.server.ts` — extended `PayoutCaseResponse` with
  `assignment: { current: AssignmentSummary | null; history: AssignmentHistoryItem[] }`,
  placed immediately after the `auditContext` block and before `outcomeAgeHours` to
  mirror the canonical `PaymentCaseResponse` ordering.
- `apps/admin-v2/src/lib/admin-mutations.server.ts` — appended the three new server
  actions (`claimPayoutAssignmentAction`, `releasePayoutAssignmentAction`,
  `reassignPayoutAssignmentAction`) and the private
  `revalidatePayoutAssignmentPaths(payoutId)` helper (revalidates `/payouts` and
  `/payouts/${payoutId}`) directly after `reassignPaymentRequestAssignmentAction` and
  before `resetAdminPasswordAction`. No new imports.
- `apps/admin-v2/src/app/(shell)/payouts/[payoutId]/page.tsx` — additive imports
  (`getAdmins`, `AssignmentCard`, the three new payout assignment server actions);
  new identity-aware capability derivation block (`canClaim` / `canRelease` /
  `canReassign`) modeled on the canonical payments case page; conditional
  `getAdmins({ page: 1, pageSize: 50, status: 'ACTIVE' })` fetch only when
  `canReassign === true`; `<AssignmentCard ... />` invocation between the
  "Outcome timeline / Related ledger chain" `<section className="detailGrid">` and the
  "Audit context" `<section className="panel">`, with
  `copy={{ claimReasonPlaceholder: 'Why are you claiming this payout?' }}`. The
  existing `escalatePayoutAction` block, the active-escalation marker render, the
  back-to-payouts / consumer / payment-request / destination links, and the audit
  context section are all unchanged.
- `apps/admin-v2/src/app/(shell)/payouts/[payoutId]/page.test.tsx` — added `getAdmins`
  and the three payout-assignment server actions to the mocked module surface;
  added `assignments.manage` to the default identity capability set; included the
  default `assignment: { current: null, history: [] }` field on the mock case payload;
  added a `getAdmins` resolver default returning an empty `AdminsListResponse`-shaped
  page; new test asserts the AssignmentCard renders with the payout-specific claim
  placeholder when no assignment exists and that `getAdmins` is **not** invoked in that
  state; new test asserts `getAdmins` **is** invoked with the expected pagination /
  status filter when an existing assignment is present (i.e. when `canReassign === true`
  for a `SUPER_ADMIN` identity). +2 tests net.
- `scripts/admin-v2-gates/config.mjs` — additive: `CHECK_PATHS` now references this
  reconciliation note, `FRONTEND_ACTIONS` lists the three new payout assignment server
  actions (positioned directly after the `payment_request` triplet), and
  `RECONCILIATION_NOTES` carries the new top-level block enumerating the slice tokens.
  No changes to `AUDIT_ACTIONS`, `CAPABILITIES`, or `ROUTE_TOKENS`.
- `docs/admin-v2-mvp-3.6c-operational-assignments-payout-activation.md` — this file.

## Decisions

- `Decision: payout fourth resource type`. Among the values still enumerated by
  `operational_assignment_resource_type_check` but not yet activated at the application
  layer (`payout`, `fx_conversion`, `document`, `consumer`), `payout` is the only one
  with a fully landed admin-v2 case page (`/payouts/[payoutId]`) and a stable backend
  service surface. `fx_conversion` and `document` either lack a case page entirely in
  admin-v2 or live behind workspaces that are still in skeleton form; `consumer` is a
  separate ownership story (consumer-level investigation lifetimes differ materially
  from per-resource ownership). Activating `payout` exercises the full end-to-end
  surface (BFF type, server actions, page integration) while keeping the diff aligned
  with one resource only and reusing the shared infrastructure landed by 3.6b.
- `Decision: PayoutEscalationModel domain ownership signal`. The pre-existing
  `payoutEscalation` field on `PayoutCaseResponse` records *machine-detected* "this
  payout needs operator attention" classification. The new `assignment` field records
  *human-claimed* "this admin owns the investigation" ownership. They model orthogonal
  concerns and are surfaced in different page sections (escalation in the dedicated
  escalation panel near the top of the case; assignment in the new card between the
  timeline and audit-context sections).
- `Decision: zero migration (DB CHECK already permits payout)`. The
  `operational_assignment_resource_type_check` constraint defined in
  `packages/database-2/prisma/migrations/20260417223000_operational_assignment_foundation/migration.sql`
  already enumerates `'payout'`. The unique partial index
  `idx_operational_assignment_active_resource` already enforces single-active per
  `(resource_type, resource_id)` for any value of `resource_type`. No migration is
  needed; an empty one would duplicate the existing CHECK.
- `Decision: consume shared helper (no extraction)`. The 3.6b reconciliation note
  closed the helper-extraction follow-up by introducing
  `AdminV2AssignmentsService.getAssignmentContextForResource`. This slice consumes that
  helper as its fourth caller (after verification, ledger, payments). No new helper is
  introduced; the existing helper signature is sufficient for the new resource type
  because it is already typed against `AssignableResourceType` and that union widens
  automatically when the dto allowlist gains `'payout'`.
- `Decision: consume shared AssignmentCard (no component changes)`. The shared
  `<AssignmentCard>` server component already accepts a typed
  `actions: { claim, release, reassign }` triple plus `capabilities`, `assignment`,
  `reassignCandidates`, and an optional `copy` block. The new payout consumer supplies
  payout-specific actions and `claimReasonPlaceholder` text without touching the
  component file. Frozen-scope verification before this slice's frontend commits
  confirmed zero diff in `apps/admin-v2/src/components/assignment-card.tsx`.
- `Decision: payouts list assignment column out of scope`. `AdminV2PayoutsService.listPayouts`
  has its own SQL composition with cursor / pagination / filter implications, mirroring
  the 3.6a (`ledgerList` / `ledgerAnomaliesList`) and 3.6b (`paymentsList`,
  `payments operations`) deferrals. Adding an assignment column there is a separate diff
  with its own perf and pagination story; operators always navigate to the case page
  from the payout link anyway.
- `Decision: reuse assignment_* audit actions across resourceTypes`. Same as 3.6a /
  3.6b. Per-row `resource_type` is already carried as metadata
  (`row.resource_type` flowed through to `audit.resource`) — that is the right place to
  discriminate by resource type, not the action constant. Adding `payout_assignment_claim`
  / etc. would double the vocabulary.
- `Decision: SUPER_ADMIN reassign requirement preserved`. The 3.2a §17.6 invariant
  ("`reassign` requires SUPER_ADMIN") remains in force through reuse: the frozen
  `AdminV2AssignmentsService.reassign` body still enforces it, and the new payouts case
  page derives `canReassignAssignments = identity?.role === 'SUPER_ADMIN'`, matching
  the verification, ledger, and payments pages.
- `Decision: regulated decision controls preserved through reuse`. As with 3.6b, the
  payouts case page does not introduce a `decisionControls` field on its BFF response;
  the UI derives gating directly from `getAdminIdentity()` capabilities/role. The
  server endpoint remains the source of truth — UI flags only hide controls. This
  avoids widening the BFF contract solely for UI affordance and keeps all four cards
  (verification, ledger, payments, payouts) on the same gating discipline.
- `Decision: assignment orthogonal to payoutEscalation classification`. The pre-existing
  `payoutEscalation` flow models machine-detected operator attention (failed / stuck
  classification with `payout_escalate` audit). The new `assignment` flow models
  human-claimed investigation ownership. They are independent: an admin may claim a
  payout that is not yet escalated, and an escalated payout may have no assignment.
  No new validation was added linking the two flows.
- `Decision: F1 migration drift not absorbed`. CLOSED upstream by the SLICE-PATCH
  platform hygiene bundle (verified by `prisma migrate status` clean-check wired into
  pre-commit). This slice does not touch `packages/database-2/prisma/migrations/`.
- `Decision: prisma format whitespace drift not absorbed`. CLOSED upstream by the
  SLICE-PATCH platform hygiene bundle. This slice does not touch
  `packages/database-2/prisma/schema.prisma`.

## Discovered while exploring

- `AdminV2PayoutsService.getPayoutCase` already followed a sequential
  `entry → paymentMethodsById → relatedEntries → auditContext` fetch shape. Adding
  `assignment` to the existing `auditContext` await as a `Promise.all` produced the
  smallest diff (one local refactor at the await site, one new field in the return
  shape) without disturbing the surrounding fetches.
- The pre-existing payouts page test was missing `assignments.manage` from the default
  identity capability set. The test still passed against the legacy page because the
  page did not reference assignment surfaces. With the new `<AssignmentCard>` rendering
  unconditionally (gated only by `canClaim` / `canRelease` / `canReassign` per-button),
  adding `assignments.manage` to the default identity ensures the new affordance is
  exercised by the existing test fixture and asserted by the two new tests.
- `getAdmins`'s `AdminsListResponse` shape uses `total` / `page` / `pageSize`
  (not `totalCount` / `totalPages`) and includes `pendingInvitations: Array<...>`. The
  new mock resolver matches that shape exactly so the page render does not crash on
  unexpected destructuring.

## Tests baseline shift

- Backend `yarn test:admin-v2`:
  - `admin-v2-assignments.service.spec.ts` gains four positive `'payout'` tests
    (claim, release, reassign, `getAssignmentContextForResource` shape) and rotates the
    "rejects unknown resourceType" sentinel from `'payout'` to `'fx_conversion'` because
    `'payout'` is now allowlisted.
  - `admin-v2-payouts.service.spec.ts` gains one dedicated assignment-context test
    that mocks `getAssignmentContextForResource` on the injected `assignmentsService`,
    asserts the helper is invoked with `('payout', payoutId)`, and asserts the
    `current` / `history` shape is forwarded onto `payoutCase.assignment`. Every
    other `new AdminV2PayoutsService(...)` instantiation in this file picks up the
    default `{ current: null, history: [] }` mock through the shared `buildService()`
    helper (no per-test mock plumbing required).
- Frontend `yarn workspace @remoola/admin-v2 test`:
  - `apps/admin-v2/src/app/(shell)/payouts/[payoutId]/page.test.tsx` gains two new
    tests (one for the no-assignment path verifying the AssignmentCard renders with
    the payout-specific claim placeholder and `getAdmins` is not called; one for the
    assignment-present path verifying `getAdmins` is called with the expected
    pagination/status filter).
- No new e2e specs are required by the slice; the existing controller e2e coverage on
  `/admin-v2/assignments/*` already exercises the controller path for all
  resource types via the shared endpoints.

## Closed follow-ups

- No follow-ups closed in this slice. The 3.6b "Assignments aggregation SQL duplication"
  follow-up was the trigger for this fourth consumer's *consumption* of the shared
  helper (rather than another inline copy), confirming the extraction value but not
  introducing new consolidation.

## Known follow-ups

- `fx_conversion` / `document` / `consumer` resourceType activations remain
  out of scope and are tracked as separate future slices. Each activation requires a
  fully landed case-page surface plus the same `ASSIGNABLE_RESOURCE_TYPES` widening
  pattern used here.
- Auto-expire / SLA escalation / "My assignments" view / overview tile for any
  resource type remains out of scope (3.2a §11) and continues to defer to a future
  workspace slice.
- A standalone admin-v2 page test for the `<AssignmentCard>` claim / release / reassign
  *form submission* paths (covering the server-action wiring end-to-end at the page
  level) is deferred to a future page-coverage slice. Current page tests exercise
  capability gating and conditional `getAdmins` invocation; submission paths rely on
  the existing controller e2e coverage on `/admin-v2/assignments/*`.
- `payouts/operations` workspace integration of payout ownership signals (analogous
  to the 3.4a verification queue evaluator additions) is deliberately out of scope and
  remains open for a follow-up workspace slice.
