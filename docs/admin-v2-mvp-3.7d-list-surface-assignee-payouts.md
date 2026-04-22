# Slice MVP-3.7d — `list-surface assignee surfacing` for `payout` (`payouts list page`, `bucket-of-cards rendering family`, `dual-render bucket-of-cards consumer`)

## Summary

`MVP-3.7d` is a strictly additive `list-surface assignee surfacing` slice that extends
the operational-assignment surface from per-resource case pages and the four
already-landed list-page consumers (`verification` originating, `/exchange/scheduled`
from 3.7a, `/documents` from 3.7b, `/payments/operations` from 3.7c) onto the **second
bucket-of-cards list page**: `apps/admin-v2/src/app/(shell)/payouts/page.tsx`. The page
renders 6 buckets of `payout` items as `<article className="panel">` cards (no
`<table>`) **plus** a separate `highValueItems` overlay section that re-renders
qualifying items as cards in a panel above the bucket loop, so this slice is the **first
`dual-render bucket-of-cards consumer`**: the same `high-value` item appears once in the
overlay and once in its `derivedStatus` bucket, and **both** renders surface the new
assignee line.

The cell-shape decision was fixed by 3.7c (bucket-of-cards renders the assignee as one
extra muted `<p>` line, not a pseudo-column), and the cell content is fixed by
`apps/admin-v2/src/app/(shell)/verification/page.tsx:391-399` (mirrored
byte-equivalently in 3.7a, 3.7b, 3.7c). This slice mechanically applies that precedent
to `/payouts` and is the **fifth bulk consumer** of the shared
`AdminV2AssignmentsService.getActiveAssigneesForResource('payout', resourceIds)` helper
that 3.7b extracted onto `AdminV2AssignmentsService`. The helper is consumed unmodified
— no signature change, no return-shape change, no SQL change.
`apps/api-v2/src/admin-v2/assignments/ frozen (helper consumed not modified)`.

Hard rules upheld end-to-end: `no new prisma migrations` (the `'payout'` value was
already in the DB `CHECK` after `3.6c`), `no new capability` (read-only surfacing on the
already-existing payouts queue endpoint), `no new audit action` (read-only; no write
happens), `no new endpoint` (`GET /admin-v2/payouts` widened additively in its response
shape only), `no new DTO`, `no new helper extraction`, and
`no inline copy of bulk helper` (the helper is consumed via the public surface; no
inline `getActiveAssignees` copy is reintroduced in `AdminV2PayoutsService`). The slice
is a pure `'payout' resourceType list extension` against the already-landed bulk helper
surface.

## Implemented

- `additive PayoutsListResponse field` — extended the
  `PayoutsListResponse.items[]` shape inside
  `apps/admin-v2/src/lib/admin-api.server.ts:692-742` with
  `assignedTo: AdminRef | null` as the **last** field (`assignedTo field appended last`,
  after `destinationPaymentMethodSummary`). Reuses the already-exported `AdminRef` from
  `admin-api.server.ts:1050` via a forward type reference; no parallel `AdminRef` import
  is introduced. The `getPayouts` BFF function signature is unchanged.

- `getActiveAssigneesForResource shared bulk helper consumed` — wired the existing
  public bulk helper (`AdminV2AssignmentsService.getActiveAssigneesForResource(resourceType,
  resourceIds)`, landed in 3.7b at lines `545-565`) into `listPayouts` inside
  `apps/api-v2/src/admin-v2/payouts/admin-v2-payouts.service.ts:489-571`. The data-flow
  change is:

  1. The existing single `findMany` (`prisma.ledgerEntryModel.findMany({ where: …,
     orderBy, take: limit + 1, select })`) and the over-fetch-then-`slice(0, limit)`
     pattern that produces `visibleRows` run unchanged.
  2. The existing `await this.fetchPaymentMethodsById(visibleRows)` runs unchanged.
  3. A `single bulk call per request` runs immediately after the payment-method lookup:
     `await this.assignmentsService.getActiveAssigneesForResource('payout',
     visibleRows.map((row) => row.id))`.
     This is a `sequential-after-fetchPaymentMethodsById lookup` because the helper's
     input is the post-`slice` `visibleRows` id set (which is also the exact set of ids
     that will be emitted in the response). The
     payment-method fetch and the assignee fetch are kept sequential rather than
     `Promise.all`-parallelised because both already resolve quickly and a structural
     diff to `Promise.all` is out of scope per the listPayouts diff invariants.
  4. `mapPayoutListItem extended with optional assignedTo parameter`:
     `mapPayoutListItem(entry, paymentMethodsById, highValueConfig, assignedTo: AdminRef
     | null = null)` appends `assignedTo` last to the returned item object. The
     single `visibleRows.map(...)` call site passes `assigneeMap.get(row.id) ?? null` as
     the fourth argument.

  No edits to `listPayouts`'s `where`, `orderBy`, `take`, `select`, the over-fetch
  pattern, the `posture`, `stuckPolicy`, `highValuePolicy`, `pageInfo`, or
  `generatedAt`. The `derivePayoutStatus`, `getEffectiveLedgerStatus`,
  `getOutcomeAgeHours`, `assessHighValue`, `getExternalReference`,
  `mapDestinationPaymentMethod`, and `fetchPaymentMethodsById` helpers are unchanged.
  `getPayoutCase`, `escalatePayout`, `mapEscalationState`, `getEscalationBlockReason`,
  `getHighValueConfig`, and the constructor are unchanged. Because `listPayouts` returns
  a single flat `items` array (no server-side bucketing — bucketing happens client-side
  in `bucketItems(items)` on the page), no `Set<string>` deduplication is required for
  the helper input: `visibleRows.map((row) => row.id)` already produces a unique id per
  row.

- The bulk helper's `Map<string, AdminRef>` returned shape, the `Prisma.sql` template
  parameterisation (no string interpolation of `resourceIds`; the array crosses the
  boundary as `${resourceIds}::uuid[]`), and the `LEFT JOIN admin` SQL inside
  `apps/api-v2/src/admin-v2/assignments/admin-v2-assignments.service.ts:545-565` are
  consumed exactly as 3.7b shipped them — no edit, no override, no shadowing
  (`apps/api-v2/src/admin-v2/assignments/ frozen (helper consumed not modified)`). No
  string-interpolation regression on `prisma.$queryRaw` is introduced. The
  `AdminV2AssignmentsService` public surface is widened by zero methods.

- `card body assignee line placed after Destination in overlay and after Updated/Freshness in per-bucket loop`
  — `overlay bucket and per-bucket loop both render assignee line`. Two new
  `<p className="muted">Assigned to: …</p>` lines were appended to
  `apps/admin-v2/src/app/(shell)/payouts/page.tsx`, one in **each** of the two card
  render call sites for the same item shape:

  - the `highValueItems.map(...)` overlay rendering (lines `162-188` pre-edit) — the new
    line follows the existing `<p className="muted">Destination: {renderDestination(item)}</p>`
    line; it is the last muted line in the overlay card body.
  - the per-bucket `bucket.items.map(...)` loop (lines `208-257` pre-edit) — the new
    line follows the existing `<p className="muted">Updated: {formatDate(item.updatedAt)} ·
    Freshness: {item.dataFreshnessClass}</p>` line; it is the last muted line in the
    per-bucket card body.

  Cell content mirrors `apps/admin-v2/src/app/(shell)/verification/page.tsx:391-399`
  byte-equivalently (with `<span>` substituted for `<div>` because the parent is a
  `<p>` paragraph, not a `<td>` table cell), and matches 3.7c's
  `apps/admin-v2/src/app/(shell)/payments/operations/page.tsx:82-92` byte-for-byte:

  ```tsx
  item.assignedTo ? (
    <>
      <span>{item.assignedTo.name ?? item.assignedTo.email ?? item.assignedTo.id}</span>
      {item.assignedTo.email ? <span className="muted"> {item.assignedTo.email}</span> : null}
    </>
  ) : (
    <span className="muted">—</span>
  )
  ```

  `BUCKET_ORDER`, `BUCKET_COPY`, `renderDestination`, `renderHighValueThresholds`,
  `bucketItems`, the `pageHeader`, the `Back to ledger` link, the `Next` link, the
  `statsGrid` section, the `highValuePolicy` section header, and the bucket-level pill
  row are all unchanged. No new helper component, no `<AssigneeMutedLine>` extraction,
  no new column slot, no new section divider. The two new JSX blocks were deliberately
  inlined at each render site (no shared sub-component) per Decision 5.

- Test coverage:
  - `apps/api-v2/src/admin-v2/payouts/admin-v2-payouts.service.spec.ts` — extended the
    existing `buildService()` factory's `assignmentsService` stub (lines `45-47`
    pre-edit) with a sibling permissive default `getActiveAssigneesForResource: jest.fn(
    async () => new Map())`, the **minimum** fixture fix required so every existing
    `listPayouts` and `getPayoutCase` test keeps passing without per-test edits.
    Added one new `it('decorates payout list items with the active assignee via
    getActiveAssigneesForResource', ...)` block adjacent to the two existing
    `listPayouts`-shape tests inside the existing `describe('AdminV2PayoutsService',
    ...)`. The new test mocks `ledgerEntryModel.findMany` with two payout rows
    (`payout-A` and `payout-B`), mocks the helper to return `Map<'payout-A',
    AdminRef>` leaving `payout-B` unassigned, and asserts:
    1. `payouts.items[0]` is `payout-A` with `assignedTo: { id: 'admin-7', name: null,
       email: 'ops7@example.com' }`.
    2. `payouts.items[1]` is `payout-B` with `assignedTo: null`.
    3. `getActiveAssigneesForResource` is called exactly **once** with
       `('payout', expect.arrayContaining(['payout-A', 'payout-B']))`. The second
       argument is asserted via `arrayContaining` rather than strict equality so the
       test is not coupled to `findMany` row ordering (mirrors 3.7c precedent).
  - All seven pre-existing tests in this spec file (`derives payout queue statuses
    and high-value overlay …`, `never invents destination linkage …`, `returns payout
    case with narrow escalation controls …`, `fetches operational assignment context for
    the payout case …`, `requires explicit confirmation for payout escalation`,
    `rejects payout escalation for statuses outside failed and stuck`, `creates a
    durable payout escalation record …`, `returns the existing escalation marker …`)
    remain unmodified and pass under the widened `buildService` factory: 9/9 PASS.

  - `apps/admin-v2/src/app/(shell)/payouts/page.test.tsx` — extended the two existing
    inline mocked `items` (`payout-failed` and `payout-stuck`) with `assignedTo`: the
    first item gains a populated `AdminRef` (`{ id: 'admin-7', name: 'Admin Seven',
    email: 'ops7@example.com' }`), the second gains `assignedTo: null`. Added three
    targeted assertions to the existing `it(...)` block: `expect(markup).toContain(
    'Assigned to:')`, `expect(markup).toContain('Admin Seven')`, and
    `expect(markup).toContain('ops7@example.com')`. The pre-existing assertions on
    framing, route hrefs, destination strings, high-value labels, and the absence of
    forbidden payout actions are unchanged. Page test 1/1 PASS.

- Frozen workspaces and surfaces (zero diff confirmed against the slice range):
  `apps/api/ workspace frozen`, `apps/admin/ workspace frozen`,
  `apps/api-v2/src/consumer/ workspace frozen`,
  `apps/api-v2/src/admin-v2/assignments/ frozen (helper consumed not modified)`,
  `apps/admin-v2/src/components/assignment-card.tsx` (frozen since 3.6b),
  `apps/admin-v2/src/lib/admin-mutations.server.ts`,
  `apps/api-v2/src/admin-v2/payouts/admin-v2-payouts.controller.ts`,
  `apps/api-v2/src/admin-v2/payouts/admin-v2-payouts.module.ts`,
  `packages/database-2/prisma/schema.prisma`, and
  `packages/database-2/prisma/migrations/`. The `payout_escalate flow frozen`
  (controller `@Post(':id/escalate')`, service `escalatePayout`, audit binding,
  `escalatePayoutAction`, `revalidatePayoutPaths`, the `PayoutEscalation` overlay, and
  the `actionControls` block on `getPayoutCase` are all zero-diff). Sibling list pages
  remain frozen on this slice: `payments list assignment column out of scope`,
  `ledger list assignment column out of scope`, and
  `ledger anomalies list assignment column out of scope`. Companion mutation/affordance
  deferrals: `assignee filter out of scope`, `assignee sort out of scope`, and
  `claim from list affordance out of scope`. The
  `consumer resourceType activation out of scope pending architectural design` deferral
  remains in force.

## Verification

Required commands (all PASS):

- `yarn verify:admin-v2-gates` — pre-commit reconciliation gate PASS on each commit
  (the new `docs/admin-v2-mvp-3.7d-list-surface-assignee-payouts.md` path is registered
  in `CHECK_PATHS` and every required token from this slice's handoff §11 is present
  verbatim in `RECONCILIATION_NOTES`).
- `yarn typecheck:v2-apps` — `@remoola/admin-v2` and `@remoola/api-v2` both OK.
- `yarn lint:admin-v2` and `yarn lint:api-v2` — 0 warnings.
- `yarn workspace @remoola/api-v2 run test --testPathPatterns='admin-v2-payouts.service'`
  — `9/9` PASS, including the new `decorates payout list items with the active assignee
  via getActiveAssigneesForResource` test and all seven pre-existing tests under the
  widened `buildService` factory.
- `yarn workspace @remoola/admin-v2 run test --testPathPatterns='payouts/page.test'` —
  `1/1` PASS, with the additive populated/null fixture and the three new assertions on
  rendered cell content.

Diff-stat invariants (verified against the slice range):

- `apps/admin-v2/src/lib/admin-api.server.ts` — additive only: one new line
  (`assignedTo: AdminRef | null;`) appended last in the `PayoutsListResponse.items[]`
  shape. No other type widened. No import added (forward type reference to the same
  module's existing `AdminRef` export at line `1050`).
- `apps/api-v2/src/admin-v2/payouts/admin-v2-payouts.service.ts` — diff bounded to:
  one widened import (`type AdminRef` added to the existing `AdminV2AssignmentsService`
  import line); one optional parameter added to `mapPayoutListItem` plus `assignedTo`
  appended in its return; one new `getActiveAssigneesForResource` call inside
  `listPayouts` (between `fetchPaymentMethodsById` and the `next` cursor lookup); one
  updated `visibleRows.map(...)` call site that threads `assigneeMap.get(row.id) ?? null`
  as the fourth argument to `mapPayoutListItem`. No edits to `where`, `orderBy`, `take`,
  `select`, the `posture`, `stuckPolicy`, `highValuePolicy`, `pageInfo`, `generatedAt`,
  `getPayoutCase`, `escalatePayout`, `getHighValueConfig`, `assessHighValue`,
  `derivePayoutStatus`, `mapDestinationPaymentMethod`, or `fetchPaymentMethodsById`. No
  `Promise.all` shape change.
- `apps/admin-v2/src/app/(shell)/payouts/page.tsx` — additive only: two new
  `<p className="muted">Assigned to: …</p>` blocks (one in each of the two card render
  call sites). No edits to `BUCKET_ORDER`, `BUCKET_COPY`, `renderDestination`,
  `renderHighValueThresholds`, `bucketItems`, the `pageHeader`, the `Back to ledger`
  link, the `statsGrid` section, the `highValuePolicy` section header, or the bucket-level
  pill row.
- `apps/api-v2/src/admin-v2/assignments/admin-v2-assignments.service.ts` — **zero
  diff** (consumed unmodified).
- `apps/api-v2/src/admin-v2/payouts/admin-v2-payouts.controller.ts`,
  `apps/api-v2/src/admin-v2/payouts/admin-v2-payouts.module.ts` — zero diff.
- `apps/admin-v2/src/app/(shell)/payouts/page.test.tsx` — additive: `assignedTo`
  appended on the two existing mocked items (one populated, one `null`) plus three
  rendered-text assertions on the existing `it(...)` block.
- `apps/api-v2/src/admin-v2/payouts/admin-v2-payouts.service.spec.ts` — additive
  diff bounded to: one sibling permissive default mock on the `buildService` factory
  (`getActiveAssigneesForResource: jest.fn(async () => new Map())`) + one new `it(...)`
  block. The other seven pre-existing tests are byte-untouched.
- `packages/database-2/prisma/` — zero diff (`no new prisma migrations`).
- `apps/api/`, `apps/admin/`, `apps/api-v2/src/consumer/` — zero diff.

Visual / behavioural:

- The `/payouts` page renders the new "Assigned to" line as the last muted line inside
  each `<article className="panel">` card across **both** the high-value overlay panel
  and the per-bucket main loop. Cards with no active assignment render
  `Assigned to: —` (muted em-dash). Cards with an active assignment render
  `Assigned to: <name|email|id>` with the `email` appended as a muted suffix when
  present (mirroring verification / exchange-scheduled / documents / payments-operations
  cell content family-byte-equivalent). A `high-value` item with a `derivedStatus` in
  `BUCKET_ORDER` shows the same assignee line in both the overlay card and the
  per-bucket card without any inconsistency.
- Row click-through (`/payouts/[payoutId]`), the bucket pill counts, the `Back to
  ledger` link, the bucket-level `pageHeader`, the `Persisted: … · Effective: …`
  per-card line, the `Consumer:` and `Payment request:` lines, the `Destination:` and
  `Linkage:` line, the `External reference:` and `Outcome age:` line, the `High-value:`
  line, the `Updated:` and `Freshness:` line, and the empty-state branches are all
  unchanged.
- The `payout_escalate flow frozen` is observable on the case page: the
  `actionControls` block, escalation gating, `payoutEscalation` overlay, and audit
  binding are unchanged.

## Decisions

- `Decision: bucket-of-cards cell shape inherited from 3.7c without re-litigation` —
  the bucket-of-cards cell shape (one extra muted `<p>` line at the end of the existing
  card body) was decided in 3.7c against `/payments/operations`. `/payouts` is the
  second consumer of the same rendering family. Re-litigating between options
  considered in 3.7c (muted-`<p>` vs card-footer chip vs structured "card meta" row)
  would either violate the family precedent or introduce divergent shapes for two
  bucket-of-cards pages on the same admin shell. The muted-`<p>` precedent is therefore
  inherited byte-equivalently, with the cell content mirrored from
  `verification/page.tsx:391-399` (already mirrored byte-equivalently in 3.7a, 3.7b,
  3.7c). Consequence: the only choice this slice makes about the cell shape is the
  *placement* (Decision 6); the shape itself is fixed.

- `Decision: dual-render coverage overlay bucket and per-bucket loop both render assignee line`
  — `/payouts/page.tsx` has **two** card-rendering call sites for the same item shape:
  the `highValueItems` overlay panel (lines `162-188` pre-edit) and the per-bucket loop
  (lines `208-257` pre-edit). A `high-value` item whose `derivedStatus` is in
  `BUCKET_ORDER` appears in **both** sections. Rendering the assignee in only one site
  would create an asymmetric UX where the same item shows different metadata depending
  on which section the operator scans first. The new `<p className="muted">Assigned to:
  …</p>` line is therefore appended to **both** call sites, after the last existing
  muted line in each (after `Destination: ...` in the overlay card body; after
  `Updated: ... · Freshness: ...` in the per-bucket card body — see Decision 6). The
  cell content is byte-equivalent across the two sites and across the family. The
  alternative (rendering in only one site, or extracting an "overlay-only-suppressed"
  rule) would invent a special case not present elsewhere in the page (every existing
  muted line that the overlay does include matches the per-bucket version verbatim).

- `Decision: thread assignee via mapPayoutListItem optional parameter` —
  `mapPayoutListItem(entry, paymentMethodsById, highValueConfig)` is the single
  canonical per-item shape factory inside `AdminV2PayoutsService`. The `listPayouts`
  response builds items via this factory at exactly one call site. Adding the new
  `assignedTo` field at the call site instead of inside the factory would still compile,
  but would duplicate the field-name decision and risk drift if a second list consumer
  is ever added in the future. The factory is therefore extended with an optional
  fourth parameter `assignedTo: AdminRef | null = null` and the field is appended last
  in the returned object. The `visibleRows.map(...)` call site passes
  `assigneeMap.get(row.id) ?? null` as the fourth argument. The default-`null`
  signature keeps `mapPayoutListItem` backward-compatible for any speculative future
  caller and mirrors 3.7c Decision 3 for `mapPaymentOperationsQueueItem`.

- `Decision: spec-test boundary extend buildService factory permissively plus one new behavioural test`
  — the existing `admin-v2-payouts.service.spec.ts` uses a `buildService()` factory
  that constructs `assignmentsService` with only `getAssignmentContextForResource: jest.fn(
  async () => ({ current: null, history: [] }))`. After this slice, `listPayouts` calls
  `getActiveAssigneesForResource` unconditionally, so the existing factory would return
  `undefined` and break every existing `listPayouts` test. The minimum fix is to add a
  sibling permissive default `getActiveAssigneesForResource: jest.fn(async () => new
  Map())` to the factory's `assignmentsService` object, preserving every existing test
  unchanged, then add exactly **one** new `it(...)` block that asserts the new field's
  contract end-to-end. This is the cleaner mechanical shape than 3.7c (which had to
  update each existing test individually because the payments spec lacks a
  `buildService` factory). No other test was edited; no `createService` factory was
  refactored beyond the additive sibling default.

- `Decision: no shared AssigneeMutedLine component extraction` — with this slice, the
  bucket-of-cards muted-line cell shape exists in three call sites across the codebase
  (3.7c's `/payments/operations` card + the two new sites in `/payouts`'s overlay and
  per-bucket loop). Extraction is technically possible but premature: the backend
  helper extraction trigger fired at the third bulk consumer (3.7b precedent for
  `getActiveAssigneesForResource`); frontend component extraction follows the same
  discipline and waits for a third independent bucket-of-cards **page** consumer (not
  on the immediate horizon — `/payments/operations` and `/payouts` are the only
  bucket-of-cards pages today). Collapsing only the assignee line into a shared
  sub-component while the surrounding overlay and per-bucket card bodies diverge in
  other muted-line content would create an inconsistent abstraction boundary; the two
  `/payouts` call sites within this slice are therefore deliberately not de-duplicated.

- `Decision: assignee placement at end of card body in each render site` — the two
  `/payouts` card bodies have different muted-line orderings (overlay: 3 lines ending
  with `Destination: ...`; per-bucket: 6 lines ending with `Updated: ... · Freshness:
  ...`). The new line is appended as the last muted line in **each** card body,
  preserving the existing reading flow ("what is this case → why is it on the queue →
  who/when context → who owns the case") in each render site, minimising diff to the
  existing muted-line orderings, and matching 3.7c's "operational ownership is the last
  metadata line you read before clicking through to the case". Inserting between
  existing muted lines was rejected (would force eye-travel reorder); promoting above
  the `pillRow` was rejected (would push case-justification context below ownership
  context); ordering the two render-site placements differently from each other was
  rejected (would introduce an asymmetric cognitive load).

## Discovered while exploring

`listPayouts` returns a single flat `items` array — there is **no server-side
bucketing**. The 6 buckets visible on `/payouts` are computed client-side via
`bucketItems(items)` on the page, and the `highValueItems` overlay is a derived
`items.filter(item => item.highValue.eligibility === 'high-value')` also computed on
the page. Consequently the helper input is exactly `visibleRows.map((row) => row.id)`
(unique by `id` because a single `findMany` produces unique rows), and **no
`Set<string>` deduplication is required** for the bulk lookup input. This is a notable
asymmetry against 3.7c's `payments-operations` page, where 5 server-side bucket
pipelines (some of which over-fetch `LIMIT_PER_BUCKET * 3` to compensate for
post-`findMany` filters) can yield cross-bucket repeat ids and therefore require a
`Set` to dedupe before the helper call. Both pages reach the same bulk-helper invariant
("the helper input is exactly the set of ids actually emitted in the response"), but
the data shape they start from differs.

The dual-render character of `/payouts` (the same item appearing once in the overlay
and once in its bucket) is also unique among all five list-surface assignee consumers
to date: verification, exchange/scheduled, documents, and payments-operations each
render every visible item exactly once. `/payouts` is therefore the first dual-render
consumer of the cell shape, but the dual rendering is purely a JSX-level concern: the
backend response shape carries `assignedTo` per item exactly once, and the React tree
reads it directly off the same item object in both render sites. No shared sub-component
is required to keep the two renders in sync (Decision 5).

The 3.7c reconciliation note's `Follow-ups` bullet "Performance index audit on
`operational_assignment(resource_type, resource_id, released_at)` is now on the
immediate horizon … evaluate before the fifth bulk consumer (`/payouts`) lands" was
already discharged by the `SLICE-PATCH operational_assignment active-lookup index
audit` (`docs/admin-v2-mvp-3.7d-pre-perf-operational-assignment-active-lookup-index-audit.md`,
`Decision (a): Existing indexes are sufficient — no new migration`). That patch
audited the active-lookup predicate against the existing
`idx_operational_assignment_active_resource` partial unique index and the full
composite, captured `EXPLAIN (ANALYZE, BUFFERS)` evidence per cardinality bucket on
local dev seed scale, and explicitly recorded `Decision: payouts list-surface assignee
slice (3.7d) unblocked but not absorbed` together with the forward trigger
`production re-baseline due before sixth bulk consumer or one order-of-magnitude
row-count growth`. This slice ships on top of that audit unchanged: no perf re-baseline
runs as part of this slice, and no new index or migration is introduced.

## Follow-ups

- Re-evaluate `/payments`, `/ledger`, `/ledger/anomalies` as separate
  responsive-triple-render slices, each with its own risk-class assessment.
- `consumer` resourceType activation remains pending architectural design for
  cross-context ownership composition (last referenced in
  `admin-v2-handoff/README.md`); not absorbed by this slice
  (`consumer resourceType activation out of scope pending architectural design`).
- `production re-baseline of operational_assignment(resource_type, resource_id, released_at) deferred to sixth bulk consumer`
  — this slice is the fifth bulk consumer; the audit's forward trigger is "before the
  sixth bulk consumer or one order-of-magnitude row-count growth" (per
  `docs/admin-v2-mvp-3.7d-pre-perf-operational-assignment-active-lookup-index-audit.md`).
  The next bulk-helper consumer slice owns that re-baseline.
- `<AssigneeMutedLine>` component extraction is deferred until a third independent
  bucket-of-cards **page** consumer arrives (not on the immediate horizon —
  `/payments/operations` and `/payouts` are the only bucket-of-cards pages today).
- `Closed follow-up: payouts list assignment surfacing` — the
  `MVP-3.7a` / `MVP-3.7b` / `MVP-3.7c` `payouts list assignment column out of scope`
  (and `payouts list assignment surfacing out of scope`) deferral chain closes with
  this slice.

## Deviations

- `Deviation: handoff-README LANDED-move skipped` — the slice handoff body
  (`admin-v2-handoff/SLICE-MVP-3.7d-list-surface-assignee-payouts.md`,
  `Reconciliation / Delivery Notes` section, `admin-v2-handoff/README.md` move-to-landed
  task) calls for moving the 3.7d handoff entry into `admin-v2-handoff/README.md`
  `## Landed` (or equivalently into `admin-v2-handoff/LANDED.md` `## Landed slices`
  per the recent split). This step was **intentionally skipped** for this slice for
  the same reason it was skipped on 3.7c: the working tree contains a pending policy
  change that reclassifies the entire `admin-v2-handoff/` directory as personal scratch
  (not for commit) via an unstaged `.gitignore` addition (`# admin-v2 handoff/pack —
  personal scratch, не для commit` followed by `admin-v2-handoff/`, `admin-v2-pack/`,
  `admin-v2-planning-input.md`); the previous `admin-v2-handoff/README.md` is staged
  for deletion in the index, consistent with that policy. Performing the README
  LANDED-move now would either be invisible (post-ignore) or produce a dirty `D+M`
  index state that conflates this slice with the unrelated cross-cutting policy
  change. The canonical in-tree landing record for this slice is therefore the present
  reconciliation note (`docs/admin-v2-mvp-3.7d-list-surface-assignee-payouts.md`),
  registered in `scripts/admin-v2-gates/config.mjs` `CHECK_PATHS` and
  `RECONCILIATION_NOTES`. This deviation is scoped to 3.7d only and inherits the same
  precedent envelope as 3.7c: subsequent slices should inherit whatever treatment the
  `admin-v2-handoff/` directory ultimately receives once the pending `.gitignore`
  policy change is committed (or reverted) by a separate cross-cutting cleanup.
