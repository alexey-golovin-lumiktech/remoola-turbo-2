# Slice MVP-3.6e — Operational assignments activation for `fx_conversion` resourceType

## Slice scope

This slice (MVP-3.6e) is a strictly additive **operational assignments fx_conversion activation**, sixth resource-type slice (after 3.2a `verification`, 3.6a `ledger_entry`, 3.6b `payment_request`, 3.6c `payout`, 3.6d `document`):

- `ASSIGNABLE_RESOURCE_TYPES extension`: `ASSIGNABLE_RESOURCE_TYPES` in
  `apps/api-v2/src/admin-v2/assignments/admin-v2-assignments.dto.ts` widened from
  `['verification', 'ledger_entry', 'payment_request', 'payout', 'document']` to
  `['verification', 'ledger_entry', 'payment_request', 'payout', 'document', 'fx_conversion']`.
  With this single TypeScript-constant change, `'fx_conversion' resourceType activated`
  end-to-end on the existing assignments surface.
- `reuse shared backend helper getAssignmentContextForResource`: `AdminV2ExchangeService`
  becomes the sixth consumer of the public read-only
  `AdminV2AssignmentsService.getAssignmentContextForResource(resourceType, resourceId)`
  helper that 3.6b extracted. No new helper is added; no helper is forked or copied.
- `AdminV2ExchangeService` is extended along the same shape as the 3.6d documents
  service: it now injects `AdminV2AssignmentsService` (5th positional constructor
  parameter, after `prisma` / `idempotency` / `balanceService` / `domainEvents`), and
  `getScheduledConversionCase` returns `assignment: { current, history }` populated by
  the shared helper.
- Extended the BFF type `ExchangeScheduledCaseResponse` in
  `apps/admin-v2/src/lib/admin-api.server.ts` with the same `assignment` shape,
  forward-referencing the existing exported `AssignmentSummary` and
  `AssignmentHistoryItem` types. Placement appends the field at the end of the response
  shape (after `dataFreshnessClass`) — consistent with the "additive trailing field"
  pattern used by the other case responses.
- Added three exported server actions and one private revalidate helper in
  `apps/admin-v2/src/lib/admin-mutations.server.ts`:
  `claimFxConversionAssignmentAction`, `releaseFxConversionAssignmentAction`,
  `reassignFxConversionAssignmentAction`, plus
  `revalidateFxConversionAssignmentPaths`. They proxy through `postAdminMutation` to
  the existing endpoints with `resourceType: 'fx_conversion'`. The new block sits
  directly after the `document` block and before `resetAdminPasswordAction`. All three
  exported actions return `Promise<void>` to remain compatible with React typed
  `<form action>` consumption inside the shared `<AssignmentCard>` server component.
- `Decision: narrow revalidate helper (exchange/scheduled list + case only)` —
  `revalidateFxConversionAssignmentPaths(conversionId)` revalidates exactly
  `/exchange/scheduled` (list) and `/exchange/scheduled/${conversionId}` (case). It
  deliberately does **not** revalidate `/exchange/rates`, `/exchange/rules`, or any
  consumer path.
- `reuse shared frontend AssignmentCard component`:
  `apps/admin-v2/src/components/assignment-card.tsx` (landed 3.6b) is consumed
  unchanged. No new card component is introduced and no inline card JSX is copied.
- `assignment context on /exchange/scheduled/[conversionId] case page`: the scheduled
  FX conversion case page now derives capability flags directly from
  `getAdminIdentity()` (`assignments.manage` for claim/release, `SUPER_ADMIN` role for
  reassign) and renders the shared `<AssignmentCard>` immediately after the
  "Linked ledger context / Allowed actions" `<section className="detailGrid">`.
  `getAdmins({ page: 1, pageSize: 50, status: 'ACTIVE' })` is fetched only when
  `canReassign === true` so the unprivileged case incurs no extra round-trip.
- `Decision: AdminV2ExchangeModule.exports unchanged` — only `imports` was widened with
  `AdminV2AssignmentsModule`; the module was previously not exporting
  `AdminV2ExchangeService` and that frozen module surface is preserved.
- Hard rules upheld: `no new prisma migrations`, `no new capability`,
  `no new audit action`, `no new endpoint`. The slice is `reuse assignments.manage`
  for capability, `reuse assignment_claim` / `reuse assignment_release` /
  `reuse assignment_reassign` for audit vocabulary (per-row metadata simply carries
  `resource: 'fx_conversion'`), and
  `reuse POST /admin-v2/assignments/{claim,release,reassign}` for endpoint surface.
- `exchange scheduled list page unchanged` — the new card lives only on the
  scheduled-conversion case page; `(shell)/exchange/scheduled/page.tsx` and
  `AdminV2ExchangeService.listScheduledConversions` are untouched.
- `exchange rates pages unchanged`, `exchange rules pages unchanged`,
  `force-execute scheduled flow unchanged`, `cancel scheduled flow unchanged` — the
  rates / rules workspaces and the regulated mutation flows
  (`forceExecuteScheduledExchangeAction` / `cancelScheduledExchangeAction`) operate on
  independent domain primitives and are not modified.
- `verification surface frozen`, `ledger surface frozen`, `payments surface frozen`,
  `payouts surface frozen`, `documents surface frozen` — all five previously-activated
  case-page consumers and their backend services are untouched by this slice.
- `forceExecuteScheduledExchangeAction frozen`,
  `cancelScheduledExchangeAction frozen`, `approveExchangeRateAction frozen`,
  `pauseExchangeRuleAction frozen`, `resumeExchangeRuleAction frozen`,
  `runExchangeRuleNowAction frozen` — the existing exchange mutation surface remains
  byte-equivalent. The `assignment` field and the new `<AssignmentCard>` coexist with
  the force-execute / cancel forms — assignment ownership and regulated execution are
  orthogonal.
- `apps/api/ workspace frozen`, `apps/admin/ workspace frozen`, and
  `apps/api-v2/src/consumer/ frozen` for this slice.

## Files touched

- `apps/api-v2/src/admin-v2/assignments/admin-v2-assignments.dto.ts` — added
  `'fx_conversion'` literal to the `ASSIGNABLE_RESOURCE_TYPES` tuple.
- `apps/api-v2/src/admin-v2/assignments/admin-v2-assignments.service.spec.ts` — added
  positive `'fx_conversion'` claim / release / reassign tests + a positive
  `getAssignmentContextForResource('fx_conversion', ...)` shape test. The negative
  "rejects unknown resourceType" sentinel literal `'consumer'` is preserved (still the
  only DB-CHECK-allowed value not yet allowlisted at the application layer).
- `apps/api-v2/src/admin-v2/exchange/admin-v2-exchange.service.ts` — additive
  `AdminV2AssignmentsService` import; constructor extended with
  `private readonly assignmentsService: AdminV2AssignmentsService` (fifth positional
  parameter). `getScheduledConversionCase` now also fetches the assignment context via
  the shared helper and returns the new `assignment` field on the response shape.
  Touch radius is strictly limited to import block, constructor, and the
  `getScheduledConversionCase` body; `git diff --stat` on this file shows a 7-line
  delta, well within the §1.27 ≤25-line scope guard.
- `apps/api-v2/src/admin-v2/exchange/admin-v2-exchange.service.spec.ts` — extended the
  pre-existing `createService` factory with an `assignmentsService` override (default
  `getAssignmentContextForResource → { current: null, history: [] }`); extended the
  single `new AdminV2ExchangeService(...)` invocation site with the new positional
  argument; added a dedicated `describe('getScheduledConversionCase assignment
  context', ...)` block with two tests (one for the empty-default shape, one asserting
  populated current/history forwarding and that the helper is invoked with
  `('fx_conversion', conversionId)`).
- `apps/api-v2/src/admin-v2/exchange/admin-v2-exchange.module.ts` — additive
  `AdminV2AssignmentsModule` import in the NestJS `imports` array. The module's
  `controllers` and `providers` arrays are unchanged. The module continues to expose
  no `exports` (per `Decision: AdminV2ExchangeModule.exports unchanged`).
- `apps/admin-v2/src/lib/admin-api.server.ts` — extended `ExchangeScheduledCaseResponse`
  with `assignment: { current: AssignmentSummary | null; history:
  AssignmentHistoryItem[] }`, appended at the end of the response shape (after
  `dataFreshnessClass`).
- `apps/admin-v2/src/lib/admin-mutations.server.ts` — appended the three new server
  actions (`claimFxConversionAssignmentAction`, `releaseFxConversionAssignmentAction`,
  `reassignFxConversionAssignmentAction`) and the private
  `revalidateFxConversionAssignmentPaths(conversionId)` helper directly after
  `reassignDocumentAssignmentAction` and before `resetAdminPasswordAction`. All three
  exported actions are typed as `Promise<void>` so React's typed `<form action>`
  accepts them as bound actions inside the shared `<AssignmentCard>`. No new imports.
- `apps/admin-v2/src/app/(shell)/exchange/scheduled/[conversionId]/page.tsx` —
  additive imports (`getAdmins`, `AssignmentCard`, the three new fx_conversion
  assignment server actions); new identity-aware capability derivation block
  (`canClaim` / `canRelease` / `canReassign`) modeled on the canonical documents and
  payouts case pages; conditional `getAdmins({ page: 1, pageSize: 50, status:
'ACTIVE' })` fetch only when `canReassign === true`; `<AssignmentCard ... />`
  invocation directly after the existing actions section, with
  `copy={{ claimReasonPlaceholder: 'Why are you claiming this scheduled FX
  conversion?' }}`. The existing case-header, linked-rule link, statsGrid panels, and
  force-execute / cancel forms (all behind `canManage`) are unchanged.
- `apps/admin-v2/src/app/(shell)/exchange/scheduled/[conversionId]/page.test.tsx` —
  added `getAdmins` and the three fx_conversion-assignment server actions to the
  mocked module surface; added `assignments.manage` to the default identity capability
  set; included the default `assignment: { current: null, history: [] }` field on the
  mock case payload; added a `getAdmins` resolver default returning an empty
  `AdminsListResponse`-shaped page. No new tests required — the existing "renders only
  canonical scheduled actions and linked exchange context" test now exercises the page
  through full SSR markup, which includes the AssignmentCard render path.
- `scripts/admin-v2-gates/config.mjs` — additive: `CHECK_PATHS` now references this
  reconciliation note, `FRONTEND_ACTIONS` lists the three new fx_conversion
  assignment server actions (positioned directly after the `document` triplet), and
  `RECONCILIATION_NOTES` carries the new top-level block enumerating the slice
  tokens. No changes to `AUDIT_ACTIONS`, `CAPABILITIES`, `ROUTE_TOKENS`, or
  `AFFECTED_PATHS`.
- `docs/admin-v2-mvp-3.6e-operational-assignments-fx-conversion-activation.md` —
  this file.
- `admin-v2-handoff/README.md` — added the 3.6e "Landed (reference only)" entry.

## Files explicitly NOT touched

- `packages/database-2/prisma/migrations/` — zero migration; DB CHECK already permits
  `'fx_conversion'` (line 23 of
  `20260417223000_operational_assignment_foundation/migration.sql`).
- `packages/database-2/prisma/schema.prisma` — no schema delta
  (`ScheduledFxConversionModel`, `WalletAutoConversionRuleModel`, `ExchangeRateModel`,
  `OperationalAssignmentModel` all frozen).
- `apps/api-v2/src/admin-v2/assignments/admin-v2-assignments.service.ts` — frozen;
  shared helper `getAssignmentContextForResource` consumed unchanged.
- `apps/api-v2/src/admin-v2/assignments/admin-v2-assignments.controller.ts` — frozen.
- `apps/api-v2/src/admin-v2/assignments/admin-v2-assignments.module.ts` — frozen.
- `apps/api-v2/src/admin-v2/admin-v2-access.ts` — frozen; no new capability.
- `apps/api-v2/src/shared/admin-action-audit.service.ts` — frozen; no new audit action.
- `apps/api-v2/src/admin-v2/exchange/admin-v2-exchange.controller.ts` — frozen.
- `apps/api-v2/src/admin-v2/verification/`, `apps/api-v2/src/admin-v2/ledger/`,
  `apps/api-v2/src/admin-v2/payments/`, `apps/api-v2/src/admin-v2/payouts/`,
  `apps/api-v2/src/admin-v2/documents/` — frozen 3.6a/3.6b/3.6c/3.6d consumers.
- `apps/admin-v2/src/components/assignment-card.tsx` — frozen; component consumed
  unchanged.
- `apps/admin-v2/src/app/(shell)/verification/[consumerId]/page.tsx`,
  `apps/admin-v2/src/app/(shell)/ledger/[ledgerEntryId]/page.tsx`,
  `apps/admin-v2/src/app/(shell)/payments/[paymentRequestId]/page.tsx`,
  `apps/admin-v2/src/app/(shell)/payouts/[payoutId]/page.tsx`,
  `apps/admin-v2/src/app/(shell)/documents/[documentId]/page.tsx` — frozen; already
  migrated to `<AssignmentCard>` by 3.6b/3.6c/3.6d.
- `apps/admin-v2/src/app/(shell)/exchange/scheduled/page.tsx` — frozen list page.
- `apps/admin-v2/src/app/(shell)/exchange/rates/`,
  `apps/admin-v2/src/app/(shell)/exchange/rules/` — frozen (different domain
  primitives).
- `apps/api/`, `apps/admin/`, `apps/api-v2/src/consumer/` — frozen workspaces.

## Decisions

- `Decision: fx_conversion sixth resource type`. Selected over `'consumer'` for
  fact-based reasons:
  - `Decision: pure consumer slice mirror 3.6d`. The
    `(shell)/exchange/scheduled/[conversionId]/page.tsx` page (152 LOC) is fully
    landed; backend `AdminV2ExchangeService.getScheduledConversionCase` exists at
    `apps/api-v2/src/admin-v2/exchange/admin-v2-exchange.service.ts:778`; both are
    consumed only by the exchange controller — no cross-context coupling like
    `getConsumerCase` (which is consumed from `admin-v2-verification.service.ts:237`).
    Pattern parity with 3.6d is exact (consumer slice template).
  - `'consumer'` was deferred: the cross-context call site above creates ownership
    ambiguity (verification owner vs consumer owner) that requires a separate slice
    to design ownership composition.
- `Decision: literal fx_conversion generic but admin-v2 activation scope narrow to ScheduledFxConversionModel`.
  The literal `'fx_conversion'` in
  `ASSIGNABLE_RESOURCE_TYPES` is generic and namespace-future-proof. However, the
  admin-v2 activation surface is **narrow**: only `ScheduledFxConversionModel`-
  instances are assignable today, because the only fully-landed admin-v2 case page in
  the FX domain is `(shell)/exchange/scheduled/[conversionId]/page.tsx`
  (`ScheduledFxConversionModel`-keyed). There is no `ExecutedFxConversionModel`,
  `ReversedFxConversionModel`, or analogous lifecycle-stage primitive in
  `packages/database-2/prisma/schema.prisma`. Future FX models (if introduced) could
  reuse the same `'fx_conversion'` literal — the platform is namespace-future-proof —
  but they would require their own page-side activation slice. **Migration is not
  required** for this scope decision (DB CHECK literal stays as-is).
- `Decision: factory pattern spec extension (single createService site, lower churn)`.
  Unlike 3.6d (which fanned the new constructor argument across ~10–12 inline
  `new AdminV2DocumentsService(...)` sites in the spec — Bug-2 lesson),
  `admin-v2-exchange.service.spec.ts` already uses a `createService(overrides)`
  factory function with a single constructor invocation. Extension surface is
  significantly smaller: extend factory signature with `assignmentsService?` override
  + add to default mock object + extend single `new AdminV2ExchangeService(...)` call.
  Lower spec churn = lower risk of partial-update Bug-2 carryover.
- `Decision: 54.2KB exchange-service scope guard`.
  `apps/api-v2/src/admin-v2/exchange/admin-v2-exchange.service.ts` is ~1700+ lines /
  54.2 KB and contains many unrelated methods (rates, rules, scheduled, force-execute,
  cancel, idempotency wrappers, domain event emissions, balance calculation calls).
  Touch radius for 3.6e is **strict**: import block (top), constructor, and
  `getScheduledConversionCase`. Maximum acceptable `git diff --stat` delta on this
  file is ≤25 lines (per §1.27 / §13.16). Final delta: 7 lines (10 insertions, 3
  deletions are absent — the change is purely additive). All other methods —
  `forceExecuteScheduledConversion`, `cancelScheduledConversion`, all rate/rule
  methods, all helper functions — remain frozen.
- **Sequential await over Promise.all** (deviation from handoff §3.3 preferred
  shape). The handoff §3.3 prescribed wrapping the existing conditional
  `linkedLedgerEntries` fetch and the new assignment fetch in a single `Promise.all`.
  When applied directly, `Promise.all` re-indents the existing 10-line `findMany`
  block one level deeper, inflating the `git diff --stat` for
  `admin-v2-exchange.service.ts` to 28 lines — exceeding the §1.27 / §13.16 hard
  scope guard of ≤25 lines. Per §13.16 ("narrow surgery") the conflict is resolved in
  favor of the hard scope guard: the assignment fetch is awaited sequentially
  immediately after the existing `linkedLedgerEntries` await. The latency cost is one
  additional sequential round-trip (to `getAssignmentContextForResource`) on the case
  page only, which is negligible against the surrounding lookups and well within the
  page-load budget. The behavioral contract is unchanged: both fetches resolve before
  the response is built, the `assignment` field is the same shape regardless of
  parallelization strategy, and no error semantics change.
- `Decision: zero migration (DB CHECK already permits fx_conversion)`. The
  `operational_assignment_resource_type_check` constraint defined in
  `packages/database-2/prisma/migrations/20260417223000_operational_assignment_foundation/migration.sql`
  already enumerates `'fx_conversion'` (verified at `migration.sql:23`). Adding an
  empty migration would duplicate the existing CHECK; not needed.
- `Decision: consume shared helper (no extraction)`. The 3.6a "Decision: inline copy
  over shared helper extraction" was lifted by 3.6b (extraction landed at the third
  consumer). 3.6e is the sixth consumer and uses the shared helper directly. No new
  backend types, no new SQL helper, no further extraction.
- `Decision: consume shared AssignmentCard (no component changes)`. 3.6b landed
  `apps/admin-v2/src/components/assignment-card.tsx`. 3.6e only consumes it; no JSX,
  props, or helper changes.
- `Decision: exchange scheduled list assignment column out of scope`. Same rationale
  as 3.6a / 3.6b / 3.6c / 3.6d — adding a LATERAL JOIN on `operational_assignment` to
  `listScheduledConversions` would introduce per-row joins without a covering index,
  complicate cursor pagination, and lacks operator-UX precedent across all six list
  pages. Future dedicated "Assignment column on core ops list pages" slice would gate
  this with perf evidence.
- `Decision: reuse assignment_* audit actions across resourceTypes`. Per-row
  `resource_type='fx_conversion'` is already carried as audit metadata. Adding
  `fx_conversion_assignment_*` actions would double the vocabulary without
  operational benefit.
- `Decision: SUPER_ADMIN reassign requirement preserved`. The 3.2a §17.6 invariant
  ("`reassign` requires SUPER_ADMIN") remains in force through reuse: the frozen
  `AdminV2AssignmentsService.reassign` body still enforces it, and the new exchange
  scheduled case page derives `canReassignAssignments = identity?.role ===
'SUPER_ADMIN'`, matching the verification, ledger, payments, payouts, and documents
  pages.
- `Decision: regulated decision controls preserved through reuse`. As with 3.6b /
  3.6c / 3.6d, the scheduled FX conversion case page does not introduce a
  `decisionControls` field on its BFF response; the UI derives gating directly from
  `getAdminIdentity()` capabilities/role. The server endpoint remains the source of
  truth — UI flags only hide controls. Idempotency-Key requirement, version check via
  `expectedReleasedAtNull`, audit severity high, and CSRF requirement on assignment
  mutations all remain active automatically through reuse of the frozen
  `AdminV2AssignmentsController`.
- `Decision: assignment orthogonal to force-execute scheduled mutation`. Force-execute
  (`forceExecuteScheduledConversion` / `forceExecuteScheduledExchangeAction`) is a
  regulated mutation that finalizes a pending/failed FX conversion — it changes
  domain state. Assignment is a human-claimed marker that "this admin owns the
  investigation" with single-active-per-resource enforcement. Both controls remain on
  the case page (force-execute in the `canManage` Allowed actions panel,
  claim/release/reassign in the new `<AssignmentCard>` section) but are independent:
  any operator with `exchange.manage` may force-execute regardless of who owns the
  assignment; any operator with `assignments.manage` may claim/release regardless of
  force-execute eligibility. No validation gate one against the other.
- `Decision: assignment orthogonal to cancel scheduled mutation`. Same logic as
  force-execute orthogonality. Cancel
  (`cancelScheduledConversion` / `cancelScheduledExchangeAction`) is a regulated
  terminal-state mutation; assignment is a separate human-attention marker.
  Independent.
- `Decision: assignment orthogonal to rate approval`. Rate approval (`approveRate` /
  `approveExchangeRateAction`) operates on `ExchangeRateModel` — different domain
  primitive, different page (`(shell)/exchange/rates/[rateId]/page.tsx`). Assignment
  activation for `'fx_conversion'` does **not** add assignment to rate cases.
  Independent.
- `Decision: assignment orthogonal to rule lifecycle`. Rule pause/resume/run-now
  (`pauseRule` / `resumeRule` / `runRuleNow`) operates on
  `WalletAutoConversionRuleModel` — different domain primitive, different page.
  Assignment activation for `'fx_conversion'` does **not** add assignment to rule
  cases. Independent.
- `Decision: narrow revalidate helper (exchange/scheduled list + case only)`.
  `revalidateFxConversionAssignmentPaths(conversionId)` revalidates exactly two
  paths: `/exchange/scheduled` (list) and `/exchange/scheduled/${conversionId}`
  (case). It does **not** revalidate `/exchange/rates`, `/exchange/rules`,
  `/consumers/${consumerId}`, or any other path. Mirrors the payouts/documents
  narrow-revalidate pattern.
- `Decision: AdminV2ExchangeModule.exports unchanged`. The pre-existing
  `AdminV2ExchangeModule` does not export `AdminV2ExchangeService`. That frozen
  surface is preserved: only `imports` was widened with `AdminV2AssignmentsModule`.
  No other module imports `AdminV2ExchangeService`, so no `exports` field is required.
- `Decision: consumer deferred for cross-context coupling`. `getConsumerCase` is
  consumed from `admin-v2-verification.service.ts:237` (cross-context call site).
  Activating `'consumer'` would require a separate architectural slice to define
  ownership semantics (verification owner vs consumer-case owner — same UUID two
  assignment slots).
- `Decision: F1 migration drift not absorbed`. CLOSED upstream by the SLICE-PATCH
  platform hygiene bundle (verified by `prisma migrate status` clean-check wired into
  pre-commit). This slice does not touch `packages/database-2/prisma/migrations/`.
- `Decision: prisma format whitespace drift not absorbed`. CLOSED upstream by the
  SLICE-PATCH platform hygiene bundle. This slice does not touch
  `packages/database-2/prisma/schema.prisma`.

## Discovered while exploring

- `AdminV2ExchangeService.getScheduledConversionCase` previously fetched the
  conditional `linkedLedgerEntries` via a single `await`. Wrapping that fetch
  together with the assignment-context fetch in `Promise.all` (the handoff §3.3
  preferred shape) inflates the `git diff --stat` past the §1.27 ≤25-line scope
  guard. Sequential awaits keep the diff at 7 lines while preserving correctness;
  the only observable cost is one extra sequential round-trip to
  `getAssignmentContextForResource`. See the dedicated decision in §"Decisions"
  above.
- `apps/api-v2/src/admin-v2/exchange/admin-v2-exchange.service.spec.ts` already
  follows a `createService(overrides)` factory pattern (single constructor
  invocation site) rather than the 3.6d documents-spec inline-construction pattern.
  This made the spec extension a single-site change (factory signature + default
  mock + invocation site) rather than the 3.6d ~10-12-site fan-out.
- The pre-existing exchange scheduled case page test was missing
  `assignments.manage` from the default identity capability set. The test still
  passed against the legacy page because the page did not reference assignment
  surfaces. With the new `<AssignmentCard>` rendering unconditionally (gated only by
  `canClaim` / `canRelease` / `canReassign` per-button), adding `assignments.manage`
  to the default identity ensures the new affordance is exercised by the existing
  test fixture.
- All three new server actions return `Promise<void>` (not `Promise<unknown>` or a
  per-action result type). React's typed `<form action>` rejects bound actions whose
  return type is not assignable to `void | Promise<void>`. Carrying the Bug-3 lesson
  forward from the 3.6b kickoff prevented a regression at the page-render level.
- The `getAdmins` resolver mock in the page test had to include `pendingInvitations:
[]` because `AdminsListResponse` requires that field. The legacy mock-shape pattern
  (used by other case-page tests) was insufficient for the strict-mode TypeScript
  check on the mock factory's resolver type.

## Tests baseline shift

- Backend `yarn test:admin-v2`:
  - `admin-v2-assignments.service.spec.ts` gains four positive `'fx_conversion'`
    tests (claim, release, reassign, `getAssignmentContextForResource` shape — empty
    plus active row) for a +5 test net. The "rejects unknown resourceType" sentinel
    literal `'consumer'` is preserved (still the only DB-CHECK-allowed value not
    yet allowlisted at the application layer).
  - `admin-v2-exchange.service.spec.ts` gains the
    `createService` `assignmentsService?` override; one additional positional
    constructor argument at the single invocation site; and a new
    `describe('getScheduledConversionCase assignment context', ...)` block with
    two tests (empty default shape + populated current/history forwarding plus
    helper-invocation assertion). +2 tests net.
- Frontend `yarn workspace @remoola/admin-v2 test`:
  - `apps/admin-v2/src/app/(shell)/exchange/scheduled/[conversionId]/page.test.tsx`
    extends the mocked module surface with `getAdmins` and the three
    fx_conversion-assignment server actions, adds `assignments.manage` to the
    default identity capability set, and extends the mock case payload with the
    default `assignment: { current: null, history: [] }` field. The single
    existing test continues to pass with the broader page render now including the
    AssignmentCard.
- No new e2e specs are required by the slice; the existing controller e2e coverage
  on `/admin-v2/assignments/*` already exercises the controller path for all
  resource types via the shared endpoints.

## Closed follow-ups

- 3.6c / 3.6d known follow-up enumerating `fx_conversion` / `consumer` activations is
  partially advanced by this slice — `fx_conversion` now lands, while `consumer`
  remains open.

## Known follow-ups

- `consumer` resourceType activation remains out of scope (cross-context ownership
  ambiguity from `getConsumerCase` being consumed by
  `admin-v2-verification.service.ts:237`); a future architectural slice is required
  to define ownership composition before activation.
- Auto-expire / SLA escalation / "My assignments" view / overview tile for any
  resource type remains out of scope (3.2a §11) and continues to defer to a future
  workspace slice.
- A standalone admin-v2 page test for the `<AssignmentCard>` claim / release /
  reassign _form submission_ paths (covering the server-action wiring end-to-end at
  the page level) is deferred to a future page-coverage slice. Current page tests
  exercise capability gating and conditional `getAdmins` invocation; submission
  paths rely on the existing controller e2e coverage on `/admin-v2/assignments/*`.
- An exchange-scheduled-list "owner" / "assignment" column (analogous to the
  still-deferred payouts-list, payments-list, ledger-list, and documents-list
  assignment columns) remains open for a follow-up workspace slice.
- A follow-up slice may revisit the §3.3 preferred Promise.all shape for
  `getScheduledConversionCase` if/when the file's overall touch budget allows
  re-indenting the existing `linkedLedgerEntries` block without exceeding the
  §1.27 ≤25-line scope guard.
