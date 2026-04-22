# Slice MVP-3.7e — `list-surface assignee surfacing` for `payment_request` (`payments list page`, `responsive-triple-render rendering family`, `first responsive-triple-render consumer`)

## Summary

`MVP-3.7e` is a strictly additive `list-surface assignee surfacing` slice that extends
the operational-assignment surface from per-resource case pages and the five
already-landed list-page consumers (`verification` originating, `/exchange/scheduled`
from 3.7a, `/documents` from 3.7b, `/payments/operations` from 3.7c, `/payouts` from
3.7d) onto the **first responsive-triple-render list page**:
`apps/admin-v2/src/app/(shell)/payments/page.tsx`. The page renders the same `items[]`
array three times via three sibling React components in the same file —
`PaymentsMobileCards`, `PaymentsTabletRows`, and `PaymentsDesktopTable` — each picked by
CSS `[data-view="mobile"|"tablet"|"desktop"]`. This slice is therefore the **first
responsive-triple-render consumer** of the assignee-cell family at scale = 3 within a
single page (3.7d's dual-render bucket-of-cards on `/payouts` was the prior multi-render
precedent at scale = 2).

The cell content is fixed by
`apps/admin-v2/src/app/(shell)/verification/page.tsx:391-399` (mirrored byte-equivalently
in 3.7a, 3.7b, 3.7c, 3.7d). This slice mechanically applies that cell content to all
three render modes on `/payments` and is the **sixth bulk consumer of
getActiveAssigneesForResource** — the shared helper
`AdminV2AssignmentsService.getActiveAssigneesForResource('payment_request',
resourceIds)` extracted by 3.7b. The helper is consumed unmodified — no signature
change, no return-shape change, no SQL change.
`apps/api-v2/src/admin-v2/assignments/ frozen (helper consumed not modified)`.

Hard rules upheld end-to-end: `no new prisma migrations` (the `'payment_request'` value
was already in the DB `CHECK` after `3.6b`), `no new capability` (read-only surfacing on
the already-existing payments queue endpoint), `no new audit action` (read-only; no
write happens), `no new endpoint` (`GET /admin-v2/payments` widened additively in its
response shape only), `no new DTO` (`additive PaymentsListResponse field`),
`no new helper extraction`, and `no inline copy of bulk helper` (the helper is consumed
via the public surface; no inline `getActiveAssignees` copy is reintroduced in
`AdminV2PaymentsService`). The slice is a pure
`'payment_request' resourceType list extension` against the already-landed bulk helper
surface. Existing bulk-helper consumer in the same service —
`payments operations queue method frozen (getPaymentRequestQueueWithAssignmentBuckets unchanged)`
— is verifiably zero-diff. `getPaymentRequestCase frozen` likewise.

## Implemented

- `additive PaymentsListResponse field` — extended the
  `PaymentsListResponse.items[]` shape inside
  `apps/admin-v2/src/lib/admin-api.server.ts:241-265` with
  `assignedTo: AdminRef | null` as the **last** field
  (`assignedTo field appended last`, after `dataFreshnessClass: string`). Reuses the
  already-exported `AdminRef` from `admin-api.server.ts:1052` via a forward type
  reference; no parallel `AdminRef` import is introduced. The forward-reference pattern
  matches the five sibling list-response shapes that all reference `AdminRef` from the
  same module before its declaration line. The `getPayments` BFF function signature is
  unchanged.

- `getActiveAssigneesForResource shared bulk helper consumed` — wired the existing
  public bulk helper (`AdminV2AssignmentsService.getActiveAssigneesForResource(resourceType,
resourceIds)`, landed in 3.7b at lines `545-565`) into `listPaymentRequests` inside
  `apps/api-v2/src/admin-v2/payments/admin-v2-payments.service.ts:250-408`. The
  data-flow change follows `Shape A post-map merge` (Decision 3):
  1. The existing single `prisma.paymentRequestModel.findMany({ where, orderBy: [{
createdAt: 'desc' }, { id: 'desc' }], take: limit + 1, select })` runs unchanged.
  2. The existing `const items = rows.slice(0, limit).map((row) => ({ ... }))` block
     runs unchanged (no edit to its body, no edit to the per-item field shape it
     produces beyond the post-map merge below).
  3. A `single bulk call per request` runs immediately after the `items` mapping:
     `await this.assignmentsService.getActiveAssigneesForResource('payment_request',
items.map((item) => item.id))`. This is a `sequential-after-findMany lookup`
     because the helper's input is the post-`slice` post-`map` `items` id set (which is
     also the exact set of ids that will be emitted in the response).
  4. A second `items.map((item) => ({ ...item, assignedTo: assigneeMap.get(item.id) ??
null }))` constructs `itemsWithAssignee` and the response returns
     `itemsWithAssignee` in the `items` field of `{ items, pageInfo }` instead of
     `items`.

  Because `listPaymentRequests` returns a single flat `items` array sourced from a
  single `findMany` ordered by `(createdAt desc, id desc)` with `take: limit + 1` and
  cut to `limit`, ids are unique by construction; **no `Set<string>` deduplication is
  required** for the helper input. This matches 3.7d's posture and contrasts with 3.7c's
  `getPaymentRequestQueueWithAssignmentBuckets` (which assembles items from five
  separate `findMany` queries and therefore needs a `Set` to dedupe cross-bucket
  repeats).

  No edits to `where`, `orderBy`, `take`, `select`, the `findMany` shape, the existing
  `items.map(...)` body, the `pageInfo` block, the `getPaymentRequestCase` /
  `getPaymentRequestQueueWithAssignmentBuckets` methods, the constructor, or the `import
type { AdminRef }` clause (`AdminRef` was already imported at line `7` together with
  `AdminV2AssignmentsService`).

- The bulk helper's `Map<string, AdminRef>` returned shape, the `Prisma.sql` template
  parameterisation (no string interpolation of `resourceIds`; the array crosses the
  boundary as `${resourceIds}::uuid[]`), and the `LEFT JOIN admin` SQL inside
  `apps/api-v2/src/admin-v2/assignments/admin-v2-assignments.service.ts:545-565` are
  consumed exactly as 3.7b shipped them — no edit, no override, no shadowing
  (`apps/api-v2/src/admin-v2/assignments/ frozen (helper consumed not modified)`). No
  string-interpolation regression on `prisma.$queryRaw` is introduced. The
  `AdminV2AssignmentsService` public surface is widened by zero methods.

- `same-file PaymentAssignedTo helper added` — added a tiny presentational helper
  `PaymentAssignedTo({ item }: { item: PaymentItem })` in
  `apps/admin-v2/src/app/(shell)/payments/page.tsx`, placed in source order between the
  existing `PaymentStatus` helper and the first render component
  `PaymentsMobileCards`. The helper renders the byte-equivalent
  `verification/page.tsx:391-399` cell content using `<span>` wrappers (so it composes
  cleanly inside a `<td>`, a `<div className="condensedRowMeta">`, and an inline
  `<div className="muted">…</div>` mobile line) and matches all five prior list-surface
  consumers' cell content byte-for-byte:

  ```tsx
  function PaymentAssignedTo({ item }: { item: PaymentItem }) {
    if (!item.assignedTo) {
      return <span className="muted">—</span>;
    }

    return (
      <>
        <span>{item.assignedTo.name ?? item.assignedTo.email ?? item.assignedTo.id}</span>
        {item.assignedTo.email ? <span className="muted"> {item.assignedTo.email}</span> : null}
      </>
    );
  }
  ```

  `cross-page AssigneeCell component extraction deferred` (Decision 5) — the helper is
  intentionally a same-file local helper adjacent to `PaymentParticipants` and
  `PaymentStatus` (the page's existing same-file-helper pattern for cell content shared
  across the three render modes). No `apps/admin-v2/src/components/<AssigneeCell>` is
  created and the five prior list pages are not refactored to consume it.

- Three render-site placements of `<PaymentAssignedTo item={item} />` were applied, one
  per render component, each following its own render-mode precedent on the page
  (Decision 1):
  - `mobile-cards muted line placement` — `PaymentsMobileCards` `queueCardBody` gains a
    new last muted line `<div className="muted">Assigned to: <PaymentAssignedTo
item={item} /></div>` after the existing `Updated:` muted line. The label-value
    inline form mirrors the page's three existing inline-labeled muted lines
    (`Attachments:`, `Due:`, `Updated:`); `<div>` (not `<p>`) is used to mirror the
    sibling muted-line elements on this page.
  - `tablet-rows fifth condensedRowMeta block placement` — `PaymentsTabletRows` gains a
    new fifth `<div className="condensedRowMeta"><PaymentAssignedTo item={item} /></div>`
    block after the existing four (participants, status, amount-+-attachments,
    due-+-updated). The block is intentionally **unlabeled** to mirror the page's
    existing four `condensedRowMeta` blocks (the page does not label tablet-row blocks;
    no `Assigned to:` prefix is rendered here).
  - `desktop-table column inserted between Status and Amount` —
    `PaymentsDesktopTable` gains a new `<th>Assigned to</th>` between `<th>Status</th>`
    and `<th>Amount</th>` in the `<thead>` row, and a matching `<td><PaymentAssignedTo
item={item} /></td>` between the Status `<td>` and the Amount `<td>` in the body.
    The new column order is `Payment request | Participants | Status | Assigned to |
Amount | Freshness | Due / Updated` (7 columns; was 6 columns).
    `colSpan bumped 6 to 7 on desktop empty-state row` — the empty-state `<td
colSpan={6}>` was bumped to `<td colSpan={7}>`. This column-insertion site mirrors
    `/exchange/scheduled` (3.7a) and `/documents` (3.7b) precedent ("Status →
    Assigned to → next domain cell").

  `formatDate`, `renderConsumerLink`, `PaymentParticipants`, `PaymentStatus`, the
  default-export `PaymentsPage`, the `pageHeader`, the filter `<form>`, the `Apply` /
  `Reset` buttons, the operations-queue link, the `nextHref(...)` helper, and the
  empty-state copy are all unchanged.

- Test coverage:
  - `apps/api-v2/src/admin-v2/payments/admin-v2-payments.service.spec.ts` — extended
    the existing inline `assignmentsService` mock on the `applies due-date and
created-time filters on payment list` test (the only pre-existing test that reaches
    `listPaymentRequests`) with a sibling permissive default
    `getActiveAssigneesForResource: jest.fn(async () => new Map())`. This is the
    **minimum** fixture fix per
    `Decision: spec-test boundary per-test sibling default mock without buildService factory`.
    Existing tests that do NOT reach `listPaymentRequests` (the
    `getPaymentRequestCase` test, the operations-queue test for
    `getPaymentRequestQueueWithAssignmentBuckets`, the operations-queue assignee-decoration
    test, the soft-deleted-edges test, the WAITING_RECIPIENT_APPROVAL stale test, and the
    `getPaymentRequestCase` assignment-context test) were untouched.
    Added one new
    `it('decorates payment request list items with the active assignee via getActiveAssigneesForResource', ...)`
    block adjacent to the existing `applies due-date …` test inside the existing
    `describe('AdminV2PaymentsService', ...)`. The new test mocks
    `paymentRequestModel.findMany` with two payment-request rows (`pr-A` and `pr-B`)
    using the minimum field shape required by the existing `items.map(...)` body, mocks
    the helper to return `Map<'pr-A', AdminRef>` leaving `pr-B` unassigned, and asserts:
    1. `result.items[0]` is `pr-A` with
       `assignedTo: { id: 'admin-7', name: null, email: 'ops7@example.com' }`.
    2. `result.items[1]` is `pr-B` with `assignedTo: null`.
    3. `getActiveAssigneesForResource` is called exactly **once** with
       `('payment_request', expect.arrayContaining(['pr-A', 'pr-B']))`. The second
       argument is asserted via `arrayContaining` rather than strict equality so the
       test is not coupled to `findMany` row ordering (mirrors 3.7c / 3.7d precedent).
  - All seven pre-existing tests in this spec file
    (`uses latest outcome semantics on payment case …`,
    `applies due-date and created-time filters on payment list`,
    `keeps soft-deleted forensic edges on payment case surfaces`,
    `builds payment operations queue buckets without mutating payment semantics`,
    `keeps stale WAITING_RECIPIENT_APPROVAL separate from plain overdue semantics`,
    `decorates payment operations queue items with active assignee via getActiveAssigneesForResource`,
    `exposes payment_request assignment context on getPaymentRequestCase via shared assignments helper`)
    remain unmodified beyond the per-test sibling-default fixture fix on the
    `applies due-date …` test, and pass after the slice: 8/8 PASS.

  - There is **no `page.test.tsx`** for `apps/admin-v2/src/app/(shell)/payments/page.tsx`
    (cf. `/payouts` which has one). No frontend fixture-fix is therefore required on this
    slice, and no new page-test file is introduced (consistent with the slice's
    "no new test surface" boundary). End-to-end page rendering is exercised via the
    admin-v2 workspace test runner, which currently does not include this page.

- `Decision: F1 migration drift not absorbed`-style hygiene concerns are not in scope
  for this slice. `Decision: prisma format whitespace drift not absorbed`-style hygiene
  concerns are not in scope for this slice.

- Frozen workspaces and surfaces (zero diff confirmed against the slice range):
  `apps/api/ workspace frozen`, `apps/admin/ workspace frozen`,
  `apps/api-v2/src/consumer/ workspace frozen`,
  `apps/api-v2/src/admin-v2/assignments/ frozen (helper consumed not modified)`,
  `apps/admin-v2/src/components/assignment-card.tsx` (frozen since 3.6b),
  `apps/admin-v2/src/lib/admin-mutations.server.ts`,
  `apps/api-v2/src/admin-v2/payments/admin-v2-payments.controller.ts`,
  `apps/api-v2/src/admin-v2/payments/admin-v2-payments.module.ts`,
  `packages/database-2/prisma/schema.prisma`, and
  `packages/database-2/prisma/migrations/`. The
  `payments operations queue method frozen (getPaymentRequestQueueWithAssignmentBuckets unchanged)`
  invariant is observable: the `getActiveAssigneesForResource('payment_request',
[...itemIdSet])` call inside that method is byte-untouched, and the operations-queue
  assignee-decoration test continues to pass without edit. `getPaymentRequestCase
frozen` likewise: the case-page assignment context still flows through
  `getAssignmentContextForResource('payment_request', ...)` and the case-page test is
  byte-untouched. Sibling list pages remain frozen on this slice:
  `ledger list assignment column out of scope` and
  `ledger anomalies list assignment column out of scope`. Companion
  mutation/affordance deferrals: `assignee filter out of scope`,
  `assignee sort out of scope`, and `claim from list affordance out of scope`. The
  `consumer resourceType activation out of scope pending architectural design` deferral
  remains in force.

## Verification

Required commands (all PASS):

- `yarn verify:admin-v2-gates` — pre-commit reconciliation gate PASS on each commit
  (the new `docs/admin-v2-mvp-3.7e-list-surface-assignee-payments-list-responsive-triple-render.md`
  path is registered in `CHECK_PATHS` and every required token from this slice's handoff
  Reconciliation section is present verbatim in `RECONCILIATION_NOTES`).
- `yarn typecheck:v2-apps` — `@remoola/admin-v2` and `@remoola/api-v2` both OK.
- `yarn lint:admin-v2` and `yarn lint:api-v2` — 0 warnings.
- `yarn workspace @remoola/api-v2 run test --testPathPatterns='admin-v2-payments.service'`
  — `8/8` PASS, including the new
  `decorates payment request list items with the active assignee via getActiveAssigneesForResource`
  test and all seven pre-existing tests under the per-test sibling-default fixture fix.

Diff-stat invariants (verified against the slice range):

- `apps/admin-v2/src/lib/admin-api.server.ts` — additive only: one new line
  (`assignedTo: AdminRef | null;`) appended last in the `PaymentsListResponse.items[]`
  shape after `dataFreshnessClass: string;`. No other type widened. No import added
  (forward type reference to the same module's existing `AdminRef` export at line
  `1052`).
- `apps/api-v2/src/admin-v2/payments/admin-v2-payments.service.ts` — diff bounded to:
  one new `getActiveAssigneesForResource` call inside `listPaymentRequests` (between the
  existing `items` mapping block and the existing `pageInfo` cursor lookup); one new
  `itemsWithAssignee = items.map(...)` post-map merge that threads `assigneeMap.get(item.id)
?? null` per item; the `return` swap (`items` → `itemsWithAssignee`) inside the
  `{ items, pageInfo }` response. No edits to `where`, `orderBy`, `take`, `select`, the
  existing `items.map(...)` body, the `pageInfo` block, the `getPaymentRequestCase`
  method, the `getPaymentRequestQueueWithAssignmentBuckets` method (its existing
  `getActiveAssigneesForResource('payment_request', [...itemIdSet])` callsite is
  byte-untouched), the constructor, or the `import type { AdminRef }` clause.
- `apps/api-v2/src/admin-v2/payments/admin-v2-payments.service.spec.ts` — additive
  diff bounded to: one sibling permissive default mock added on the
  `applies due-date and created-time filters on payment list` test's inline
  `assignmentsService` mock (`getActiveAssigneesForResource: jest.fn(async () => new
Map())`) + one new `it(...)` block. The other six pre-existing tests are
  byte-untouched.
- `apps/admin-v2/src/app/(shell)/payments/page.tsx` — additive only: one new
  `PaymentAssignedTo` helper (≤14 LOC including JSX), one new
  `<div className="muted">` line in `PaymentsMobileCards` `queueCardBody`, one new
  `<div className="condensedRowMeta">` block in `PaymentsTabletRows`, one new `<th>`
  and one new `<td>` in `PaymentsDesktopTable`, and one `colSpan` bump (`6` → `7`) on
  the empty-state row. No edits to `formatDate`, `renderConsumerLink`,
  `PaymentParticipants`, `PaymentStatus`, the `pageHeader`, the filter `<form>`, the
  `Apply` / `Reset` buttons, the operations-queue link, the `nextHref(...)` helper, or
  the empty-state copy.
- `apps/api-v2/src/admin-v2/assignments/admin-v2-assignments.service.ts` — **zero
  diff** (consumed unmodified).
- `apps/api-v2/src/admin-v2/payments/admin-v2-payments.controller.ts`,
  `apps/api-v2/src/admin-v2/payments/admin-v2-payments.module.ts` — zero diff.
- `packages/database-2/prisma/` — zero diff (`no new prisma migrations`).
- `apps/api/`, `apps/admin/`, `apps/api-v2/src/consumer/` — zero diff.

Visual / behavioural:

- The `/payments` page renders the new "Assigned to" cell at all three viewports:
  - **Mobile cards** (`[data-view="mobile"]`): a new last `Assigned to: …` muted line
    inside each `queueCardBody`, after `Updated:`. Cards with no active assignment
    render `Assigned to: —` (muted em-dash). Cards with an active assignment render
    `Assigned to: <name|email|id>` with the `email` appended as a muted suffix when
    present.
  - **Tablet rows** (`[data-view="tablet"]`): a new last unlabeled
    `condensedRowMeta` block per row, holding the same cell content as the mobile and
    desktop sites byte-equivalently. No prefix label is rendered (the page does not
    label tablet-row blocks).
  - **Desktop table** (`[data-view="desktop"]`): a new `Assigned to` column between
    `Status` and `Amount` (column 4 of 7). The empty-state row spans 7 columns with
    `colSpan={7}` (was 6).

  Cell content mirrors `apps/admin-v2/src/app/(shell)/verification/page.tsx:391-399`
  byte-equivalently across all three render modes (only the wrapper element differs:
  `<span>` instead of `<div>`/`<p>`, so the helper composes cleanly inside `<td>`,
  `<div className="condensedRowMeta">`, and the inline mobile muted line).

- Row click-through (`/payments/[paymentRequestId]`), the bucket-of-cards link to
  `/payments/operations`, the `Persisted: …` muted line, the `Attachments:` / `Due:` /
  `Updated:` muted lines, the participants block, the freshness-class column, and the
  empty-state branches are all unchanged.
- The existing `getPaymentRequestQueueWithAssignmentBuckets` operations-queue surface on
  `/payments/operations` (3.7c) is observably zero-diff: the operations-queue assignee
  cells continue to render exactly as 3.7c shipped them.

## Decisions

- `Decision: responsive-triple-render cell shape decided once per render mode with byte-equivalent value content`
  — `/payments` is the first page in the assignee-column family with three render modes
  in a single page. Each render mode has its own DOM container (`<td>` for desktop
  table, `<div className="condensedRowMeta">` for tablet, inline
  `<div className="muted">…</div>` for mobile). The cell **value** content (name ?? email
  ?? id, optional muted email span, fallback `—`) is byte-equivalent to verification /
  exchange / documents / payments-operations / payouts; the cell **frame** differs per
  render mode. Each render mode's frame was chosen against the page's existing
  precedent for that mode (mobile: inline-labeled muted line like `Attachments: ...`;
  tablet: unlabeled `condensedRowMeta` block like the existing four; desktop: dedicated
  `<th>`/`<td>` column). Promoting the assignee to the page header, introducing a `<dl>`
  / label-value grid, adding a section divider, varying the cell value content across
  render modes, and inventing a fourth shape were all rejected.

- `Decision: desktop column inserted between Status and Amount` — the desktop table
  currently has 6 columns: `Payment request | Participants | Status | Amount |
Freshness | Due / Updated`. Two precedents exist for inserting an `Assigned to`
  column on a single-table page: `/exchange/scheduled` inserts between Status and
  Timing; `/documents` inserts between Status and Owner. Both follow "Status →
  Assigned to → next domain cell". This slice inserts `Assigned to` between `Status`
  and `Amount`, producing the new 7-column order
  `Payment request | Participants | Status | Assigned to | Amount | Freshness | Due /
Updated`, and bumps the empty-state `colSpan` 6 → 7. Appending at the end (after
  `Due / Updated`), inserting before `Status`, and splitting into a sub-header group
  were all rejected.

- `Decision: thread bulk lookup via Shape A post-map merge` — the existing
  `listPaymentRequests` mapping block is a single inline `rows.slice(0, limit).map((row)
=> ({...}))` that builds the response items. Two equivalent shapes exist for adding
  the assignee field: Shape A merges `assignedTo` into the items via a second `.map(...)`
  after the bulk lookup; Shape B introduces a `visibleRows` local and inlines the
  `assignedTo` field into the existing `.map(...)` body. Shape A was chosen — the
  existing `items.map(...)` block is byte-stable, the new field's wiring is isolated to
  one new `await` + one new post-map merge + the `return` swap, and the diff is the
  smallest reviewable boundary that mirrors 3.7d's "keep the existing factory body
  byte-stable" posture (3.7d achieved the same property by passing `assignedTo` as an
  optional parameter to `mapPayoutListItem`; 3.7e's `listPaymentRequests` lacks a
  `mapPaymentListItem` factory and uses an inline `.map(...)` instead, so post-map
  merge is the structurally analogous choice). Shape B and the option of extracting a
  dedicated `mapPaymentListItem` factory were rejected.

- `Decision: spec-test boundary per-test sibling default mock without buildService factory`
  — `apps/api-v2/src/admin-v2/payments/admin-v2-payments.service.spec.ts` lacks a
  `buildService()` factory; every test constructs `AdminV2PaymentsService` inline. After
  this slice, `listPaymentRequests` calls `this.assignmentsService.getActiveAssigneesForResource(...)`
  unconditionally, so a strict reading of "do nothing" would break the existing
  `applies due-date …` test. Rather than refactor the spec to introduce a
  `buildService()` factory (a separate hygiene concern, out of scope for this slice),
  the minimum fix is to add a sibling permissive default
  `getActiveAssigneesForResource: jest.fn(async () => new Map())` to that test's inline
  `assignmentsService` mock. Tests that do NOT reach `listPaymentRequests` are
  untouched. One new `it(...)` block locks the new field's contract end-to-end. This
  mirrors the 3.7c precedent on this exact spec file (3.7c faced the same "no factory"
  structure when adding the bulk call to `getPaymentRequestQueueWithAssignmentBuckets`).

- `Decision: same-file PaymentAssignedTo helper, cross-page extraction deferred` —
  this slice introduces three render-site placements of the assignee cell on a single
  page. The page already has two same-file presentational helpers
  (`PaymentParticipants`, `PaymentStatus`) that exist precisely because their content
  needs to render across the same three render modes byte-equivalently. The
  `PaymentAssignedTo` helper is added as a same-file local helper alongside them, with
  a `<span>`-wrapped body so it composes cleanly inside `<td>`,
  `<div className="condensedRowMeta">`, and an inline `<div className="muted">…</div>`
  mobile line. A cross-page shared `<AssigneeCell>` React component was deliberately
  not extracted: cross-page extraction follows the same trigger discipline as backend
  helper extraction (3.7b extracted the bulk SQL helper at the third consumer);
  cross-page React-component extraction would need to span six different
  `<td>`/`<div>`/`<p>`/`<article>` parent containers and would be premature without an
  explicit container-shape abstraction. The same-file helper is bounded (≤14 LOC) and
  does not create a cross-page dependency.

- `Decision: freshness-check the perf trigger inline plus open follow-up for production re-baseline`
  — this slice is the `sixth bulk consumer of getActiveAssigneesForResource`, and the
  audit `docs/admin-v2-mvp-3.7d-pre-perf-operational-assignment-active-lookup-index-audit.md`
  recorded a forward trigger of "production re-baseline due before sixth bulk consumer
  or one order-of-magnitude row-count growth", so the
  `audit forward trigger fires at sixth bulk consumer`. A strict reading would gate
  this slice on a production re-baseline; a permissive reading would silently retire a
  documented forward trigger. Neither is satisfactory. The bounded mitigation actually
  taken: (i) `freshness check at local dev seed scale for payment_request length ∈ {1,
10, 100}` — re-ran the audit's EXPLAIN matrix scoped to only the `'payment_request'
× length ∈ {1, 10, 100}` row of the matrix, against the local dev DB inside a
  `BEGIN; … ROLLBACK;` block (post-rollback baseline confirmed). The captured plans
  appear verbatim in `## Discovered while exploring` below. (ii) The
  `production-scale re-baseline filed as open follow-up` is now an active
  `Open follow-up` in `admin-v2-handoff/README.md`'s `## Known follow-ups` section
  (operator-owned; requires production DB access; suggested execution path: re-run the
  audit's EXPLAIN matrix at production row counts and ship as a follow-on `SLICE-PATCH`
  mirroring `SLICE-PATCH-operational-assignment-active-lookup-index-audit.md` if any
  planner regression is found). Skipping the freshness check, expanding it to all four
  resource types or all cardinalities, proposing a new index based on it, requesting
  production DB access from inside an autonomous implementation pass, and committing
  the seed script were all rejected.

## Discovered while exploring

`listPaymentRequests` returns a single flat `items` array sourced from a single
`findMany` ordered by `(createdAt desc, id desc)` with `take: limit + 1` and cut to
`limit`. There is **no server-side bucketing** and items are unique by `id` by
construction. The helper input is therefore exactly `items.map((item) => item.id)`
and **no `Set<string>` deduplication is required** for the bulk lookup input. This
matches 3.7d's `/payouts` posture (single flat `items`, no dedup), and contrasts with
3.7c's `getPaymentRequestQueueWithAssignmentBuckets` (5 server-side `findMany` queries
per request, where the same `payment_request.id` can appear across multiple buckets and
therefore needs a `Set` to dedupe before the helper call). Both methods reach the same
bulk-helper invariant ("the helper input is exactly the set of ids actually emitted in
the response"), but the data shape they start from differs.

The responsive-triple-render character of `/payments` (the same item rendered three
times via three sibling React components in the same file, each picked by CSS
`[data-view="mobile"|"tablet"|"desktop"]`) is unique among all six list-surface assignee
consumers to date: verification, exchange/scheduled, documents, and payments-operations
each render every visible item exactly once; `/payouts` (3.7d) renders some items
twice (overlay + per-bucket); `/payments` (this slice) renders **every** item in three
sibling components for distinct viewports. The triple rendering is purely a JSX-level
concern: the backend response shape carries `assignedTo` per item exactly once, the
React tree reads it directly off the same item object in all three render sites, and
the three render sites differ only in their parent container DOM shape. No shared
sub-component is required to keep the three renders in sync (Decision 5).

There is **no `page.test.tsx`** for `apps/admin-v2/src/app/(shell)/payments/page.tsx`
(unlike `/payouts` which has one), so this slice does not require a frontend
fixture-fix on the page-test side; the additive `assignedTo` field on the BFF type
flows into the page's `type PaymentItem = PaymentsListResponse['items'][number]` shape
automatically, and the new render-site placements compile against that widened type.

### Freshness check: payment_request × length ∈ {1, 10, 100}

`freshness check at local dev seed scale for payment_request length ∈ {1, 10, 100}`,
captured non-destructively inside a `BEGIN; … ROLLBACK;` block on the local-dev
PostgreSQL 18.3 instance (`postgresql://wirebill:wirebill@127.0.0.1:5433/remoola`,
docker container `remoola_postgres`). The seed mirrors the `3.7d-pre` audit's posture:
4 resource types × 1000 active rows seeded per type (4000 active rows), plus ~50% of
those further duplicated as historical released rows (1974 additional `released_at IS
NOT NULL` rows), `ANALYZE operational_assignment` between seed and EXPLAIN, transient
admin FK reuse (existing admin UUID `6f5eb51a-0e20-48e2-9488-1f85e44bef26`). Pre-seed
baseline: `total = 0`, `active = 0`. Post-rollback baseline: `total = 0`, `active = 0`
(transactional integrity confirmed; no commit, no persisted artifact, no seed file
committed).

PostgreSQL version: `PostgreSQL 18.3 (Debian 18.3-1.pgdg13+1) on x86_64-pc-linux-gnu,
compiled by gcc (Debian 14.2.0-19) 14.2.0, 64-bit`.

Seed totals after `INSERT … FROM generate_series(...)` and historical-duplication
INSERT: `total_seeded = 5974`, `active_seeded = 4000`,
`active_pr_seeded = 1000` (1000 active `'payment_request'` rows out of 4000 active
across all four resource types).

Plan PR-1 — `payment_request × length = 1`:

```text
                                                                                             QUERY PLAN
----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Nested Loop Left Join  (cost=43.70..52.22 rows=2 width=96) (actual time=0.052..0.054 rows=1.00 loops=1)
   Join Filter: (ad.id = a.assigned_to)
   Rows Removed by Join Filter: 2
   Buffers: shared hit=7
   InitPlan 1
     ->  Aggregate  (cost=0.79..0.80 rows=1 width=32) (actual time=0.023..0.024 rows=1.00 loops=1)
           Buffers: shared hit=3
           ->  Limit  (cost=0.28..0.78 rows=1 width=16) (actual time=0.019..0.019 rows=1.00 loops=1)
                 Buffers: shared hit=3
                 ->  Index Only Scan using idx_operational_assignment_active_resource on operational_assignment  (cost=0.28..503.80 rows=998 width=16) (actual time=0.018..0.018 rows=1.00 loops=1)
                       Index Cond: (resource_type = 'payment_request'::text)
                       Heap Fetches: 1
                       Index Searches: 1
                       Buffers: shared hit=3
   ->  Bitmap Heap Scan on operational_assignment a  (cost=42.90..50.14 rows=2 width=32) (actual time=0.040..0.040 rows=1.00 loops=1)
         Recheck Cond: ((resource_type = 'payment_request'::text) AND (resource_id = ANY ((InitPlan 1).col1)) AND (released_at IS NULL))
         Heap Blocks: exact=1
         Buffers: shared hit=6
         ->  Bitmap Index Scan on idx_operational_assignment_active_resource  (cost=0.00..42.90 rows=2 width=0) (actual time=0.033..0.033 rows=1.00 loops=1)
               Index Cond: ((resource_type = 'payment_request'::text) AND (resource_id = ANY ((InitPlan 1).col1)))
               Index Searches: 1
               Buffers: shared hit=5
   ->  Materialize  (cost=0.00..1.09 rows=6 width=48) (actual time=0.007..0.009 rows=3.00 loops=1)
         Storage: Memory  Maximum Storage: 17kB
         Buffers: shared hit=1
         ->  Seq Scan on admin ad  (cost=0.00..1.06 rows=6 width=48) (actual time=0.004..0.005 rows=3.00 loops=1)
               Buffers: shared hit=1
 Planning:
   Buffers: shared hit=25
 Planning Time: 0.315 ms
 Execution Time: 0.087 ms
(31 rows)
```

Plan PR-10 — `payment_request × length = 10`:

```text
                                                                                             QUERY PLAN
-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Nested Loop Left Join  (cost=48.26..56.78 rows=2 width=96) (actual time=0.148..0.168 rows=10.00 loops=1)
   Join Filter: (ad.id = a.assigned_to)
   Rows Removed by Join Filter: 20
   Buffers: shared hit=24
   InitPlan 1
     ->  Aggregate  (cost=5.35..5.36 rows=1 width=32) (actual time=0.080..0.081 rows=1.00 loops=1)
           Buffers: shared hit=12
           ->  Limit  (cost=0.28..5.33 rows=10 width=16) (actual time=0.045..0.065 rows=10.00 loops=1)
                 Buffers: shared hit=12
                 ->  Index Only Scan using idx_operational_assignment_active_resource on operational_assignment  (cost=0.28..503.80 rows=998 width=16) (actual time=0.044..0.062 rows=10.00 loops=1)
                       Index Cond: (resource_type = 'payment_request'::text)
                       Heap Fetches: 10
                       Index Searches: 1
                       Buffers: shared hit=12
   ->  Bitmap Heap Scan on operational_assignment a  (cost=42.90..50.14 rows=2 width=32) (actual time=0.124..0.131 rows=10.00 loops=1)
         Recheck Cond: ((resource_type = 'payment_request'::text) AND (resource_id = ANY ((InitPlan 1).col1)) AND (released_at IS NULL))
         Heap Blocks: exact=9
         Buffers: shared hit=23
         ->  Bitmap Index Scan on idx_operational_assignment_active_resource  (cost=0.00..42.90 rows=2 width=0) (actual time=0.107..0.107 rows=10.00 loops=1)
               Index Cond: ((resource_type = 'payment_request'::text) AND (resource_id = ANY ((InitPlan 1).col1)))
               Index Searches: 1
               Buffers: shared hit=14
   ->  Materialize  (cost=0.00..1.09 rows=6 width=48) (actual time=0.002..0.002 rows=3.00 loops=10)
         Storage: Memory  Maximum Storage: 17kB
         Buffers: shared hit=1
         ->  Seq Scan on admin ad  (cost=0.00..1.06 rows=6 width=48) (actual time=0.009..0.010 rows=3.00 loops=1)
               Buffers: shared hit=1
 Planning Time: 0.410 ms
 Execution Time: 0.231 ms
(29 rows)
```

Plan PR-100 — `payment_request × length = 100`:

```text
                                                                                              QUERY PLAN
------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Nested Loop Left Join  (cost=93.90..102.41 rows=2 width=96) (actual time=0.299..0.468 rows=100.00 loops=1)
   Join Filter: (ad.id = a.assigned_to)
   Rows Removed by Join Filter: 200
   Buffers: shared hit=156
   InitPlan 1
     ->  Aggregate  (cost=50.98..50.99 rows=1 width=32) (actual time=0.200..0.202 rows=1.00 loops=1)
           Buffers: shared hit=102
           ->  Limit  (cost=0.28..50.73 rows=100 width=16) (actual time=0.044..0.174 rows=100.00 loops=1)
                 Buffers: shared hit=102
                 ->  Index Only Scan using idx_operational_assignment_active_resource on operational_assignment  (cost=0.28..503.80 rows=998 width=16) (actual time=0.042..0.163 rows=100.00 loops=1)
                       Index Cond: (resource_type = 'payment_request'::text)
                       Heap Fetches: 100
                       Index Searches: 1
                       Buffers: shared hit=102
   ->  Bitmap Heap Scan on operational_assignment a  (cost=42.90..50.14 rows=2 width=32) (actual time=0.274..0.350 rows=100.00 loops=1)
         Recheck Cond: ((resource_type = 'payment_request'::text) AND (resource_id = ANY ((InitPlan 1).col1)) AND (released_at IS NULL))
         Heap Blocks: exact=51
         Buffers: shared hit=155
         ->  Bitmap Index Scan on idx_operational_assignment_active_resource  (cost=0.00..42.90 rows=2 width=0) (actual time=0.253..0.254 rows=100.00 loops=1)
               Index Cond: ((resource_type = 'payment_request'::text) AND (resource_id = ANY ((InitPlan 1).col1)))
               Index Searches: 1
               Buffers: shared hit=104
   ->  Materialize  (cost=0.00..1.09 rows=6 width=48) (actual time=0.000..0.000 rows=3.00 loops=100)
         Storage: Memory  Maximum Storage: 17kB
         Buffers: shared hit=1
         ->  Seq Scan on admin ad  (cost=0.00..1.06 rows=6 width=48) (actual time=0.010..0.010 rows=3.00 loops=1)
               Buffers: shared hit=1
 Planning Time: 0.414 ms
 Execution Time: 0.552 ms
(29 rows)
```

Pass condition met across all three buckets: planner picks the
`idx_operational_assignment_active_resource partial unique candidate` for the
active-row predicate at every cardinality (`Bitmap Index Scan on
idx_operational_assignment_active_resource`); no `Seq Scan on operational_assignment`
appears at any bucket; no `operational_assignment_resource_type_resource_id_released_at_idx
full composite candidate` is preferred over the partial; `Buffers: shared hit` grows
sub-linearly with `length` (7 → 24 → 156); `Execution Time` stays sub-millisecond
(0.087 ms / 0.231 ms / 0.552 ms). This matches the audit's prior result at local-dev
scale and confirms no planner regression at the sixth-bulk-consumer threshold under
local-dev row count. The freshness check is **not** a substitute for the
production-scale re-baseline (filed as a `Follow-ups` open item below).

## Follow-ups

- `Production-scale re-baseline of operational_assignment(resource_type, resource_id,
released_at) index audit` — escalated from the local-dev audit's "due before sixth
  bulk consumer" forward trigger (which fires at this slice) to an active
  `Open follow-up` in `admin-v2-handoff/README.md` `## Known follow-ups`. Operator-owned
  (requires production DB access, which is not part of the autonomous-handoff
  implementation pass). Suggested execution path: re-run the audit's EXPLAIN matrix at
  production row counts and ship as a follow-on `SLICE-PATCH` mirroring
  `SLICE-PATCH-operational-assignment-active-lookup-index-audit.md` if any planner
  regression is found. The local-dev `freshness check at local dev seed scale for
payment_request length ∈ {1, 10, 100}` captured above is **not** a substitute.
- Re-evaluate `/ledger` and `/ledger/anomalies` as separate responsive-triple-render
  slices, each with its own risk-class assessment. Both will require
  `AdminV2AssignmentsService` injection on services that don't have it today
  (`AdminV2LedgerService` and `AdminV2LedgerAnomaliesService`); not absorbed by this
  slice (`ledger list assignment column out of scope`,
  `ledger anomalies list assignment column out of scope`).
- `consumer` resourceType activation remains pending architectural design for
  cross-context ownership composition (last referenced in
  `admin-v2-handoff/README.md`); not absorbed by this slice
  (`consumer resourceType activation out of scope pending architectural design`).
- Cross-page `<AssigneeCell>` React-component extraction is deferred until container-
  shape abstraction is itself justified by a third independent multi-render consumer.
  Currently the local `PaymentAssignedTo` is the only cross-render-mode helper;
  verification / exchange / documents / payments-operations / payouts continue to
  inline the same JSX.
- `Closed follow-up: payments list assignment column` — the
  `MVP-3.7a` / `MVP-3.7b` / `MVP-3.7c` / `MVP-3.7d`
  `payments list assignment column out of scope` deferral chain closes with this slice.
