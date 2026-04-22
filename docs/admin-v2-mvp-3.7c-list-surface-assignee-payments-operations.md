# Slice MVP-3.7c — `list-surface assignee surfacing` for `payment_request` (`payment operations queue page`, `bucket-of-cards rendering family`)

## Summary

`MVP-3.7c` is a strictly additive `list-surface assignee surfacing` slice that extends the
operational-assignment surface from per-resource case pages and the three single-table
list-page consumers (`verification` originating, `/exchange/scheduled` from 3.7a,
`/documents` from 3.7b) onto the **first bucket-of-cards list page**:
`apps/admin-v2/src/app/(shell)/payments/operations/page.tsx`. The page renders 5 buckets
of `payment_request` items as `<article className="panel">` cards (no `<table>`), so this
slice introduces the **first cell-shape decision for the bucket-of-cards rendering family**:
a single new `<p className="muted">Assigned to: …</p>` line inside the existing card body,
rather than a synthesised pseudo-column.

This is the **fourth bulk consumer** of the shared `getActiveAssigneesForResource` public
helper that 3.7b extracted onto `AdminV2AssignmentsService`. The helper is consumed
unmodified — no signature change, no return-shape change, no SQL change. The slice is a
pure `'payment_request' resourceType list extension` against the already-landed bulk
helper surface.

Hard rules upheld end-to-end: `no new prisma migrations` (the `'payment_request'` value
was already in the DB `CHECK` after `3.6b`), `no new capability` (reuses existing read
authority on the operations queue endpoint), `no new audit action` (read-only surface;
no write happens), `no new endpoint` (`GET /admin-v2/payments/operations-queue` widened
additively in its response shape only), `no new DTO`, `no new helper extraction`, and
`no inline copy of bulk helper` (the helper is consumed via the public surface; no
inline `getActiveAssignees` copy is reintroduced in `AdminV2PaymentsService`).

## Implemented

- `additive PaymentOperationsQueueResponse field` — extended the
  `PaymentOperationsQueueResponse.buckets[].items[]` shape inside
  `apps/admin-v2/src/lib/admin-api.server.ts:334-370` with
  `assignedTo: AdminRef | null` as the **last** field (`assignedTo field appended last`,
  after `dataFreshnessClass`). Reuses the already-exported `AdminRef` from
  `admin-api.server.ts:1049` via a forward type reference; no parallel `AdminRef`
  import is introduced. The `getPaymentOperationsQueue` BFF function signature is
  unchanged.

- `getActiveAssigneesForResource shared bulk helper consumed` — wired the existing public
  bulk helper (`AdminV2AssignmentsService.getActiveAssigneesForResource(resourceType,
  resourceIds)`, landed in 3.7b) into `getPaymentOperationsQueue` inside
  `apps/api-v2/src/admin-v2/payments/admin-v2-payments.service.ts:621-820`. The data-flow
  change is:

  1. The existing `Promise.all([overdueRows, uncollectibleRows, staleApprovalRows,
     inconsistentRows, missingAttachmentRows])` block runs unchanged.
  2. The two filtered/sliced bucket pipelines (`inconsistentItems` and
     `missingAttachmentItems`) run unchanged through their `.map → .filter → .slice → .map`
     chain to compute the **post-pipeline** item rows.
  3. A `Set<string>` collects the IDs of every emitted item across the 5 final buckets
     (`overdueRows`, `uncollectibleRows`, `staleApprovalRows`, `inconsistentItems`,
     `missingAttachmentItems`). Set semantics enforce `deduplicated resourceIds via Set`:
     a row that appears in more than one bucket — possible because the simple buckets and
     the inconsistent/missing buckets are computed independently against an over-fetched
     `findMany` window of `LIMIT_PER_BUCKET * 3` — contributes one and only one resource
     id to the helper input.
  4. A `single bulk call per request` runs after the `Promise.all` resolves (and after the
     intermediate pipelines computed the post-pipeline ids):
     `await this.assignmentsService.getActiveAssigneesForResource('payment_request',
     [...itemIdSet])`. This is a `sequential-after-Promise.all lookup` because the
     helper's input depends on the post-`Promise.all` ids; mirrors the 3.7a/3.7b pattern.
  5. `mapPaymentOperationsQueueItem extended with optional assignedTo parameter`:
     `mapPaymentOperationsQueueItem(row, assignedTo: AdminRef | null = null)` appends
     `assignedTo` last to the returned item object. Simple buckets (overdue, uncollectible,
     stale-approval) call the helper with `assigneeMap.get(row.id) ?? null` as the second
     argument; inconsistent/missing buckets re-spread `assignedTo` after their existing
     intermediate pipeline so the post-pipeline id is the one threaded.

  No edits to `where`, `orderBy`, `take`, `select`, the `Promise.all` shape of the 5
  `findMany` calls, the `posture` object, `generatedAt`, or the bucket
  keys/labels/operatorPrompts. The `derivePaymentRail`, `getEffectivePaymentStatus`,
  `getLatestSettlementEntry`, and `isInvoiceTaggedResource` helpers are unchanged.

- The bulk helper's `Map<string, AdminRef>` returned shape, the `Prisma.sql` template
  parameterisation (no string interpolation of `resourceIds`; the array crosses the
  boundary as `${resourceIds}::uuid[]`), and the `LEFT JOIN admin` SQL inside
  `apps/api-v2/src/admin-v2/assignments/admin-v2-assignments.service.ts:545-565` are
  consumed exactly as 3.7b shipped them — no edit, no override, no shadowing
  (`apps/api-v2/src/admin-v2/assignments/ frozen (helper consumed not modified)`). No
  string-interpolation regression on `prisma.$queryRaw` is introduced.

- `card body assignee line placed after Due / Updated / Freshness` — appended one new
  `<p className="muted">Assigned to: …</p>` line at the end of the existing
  `<article className="panel">` card body inside
  `apps/admin-v2/src/app/(shell)/payments/operations/page.tsx`, immediately after the
  existing `Due / Updated / Freshness` muted line. Cell content mirrors
  `apps/admin-v2/src/app/(shell)/verification/page.tsx:391-399` byte-equivalently
  (with `<span>` substituted for `<div>` because the parent is a `<p>` paragraph,
  not a `<td>` table cell):

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

  The `renderConsumerLink` helper, the `formatDate` helper, the bucket-iteration
  `BUCKET_ORDER` shape, the `pageHeader`, the `Back to payments` link, the bucket-level
  pill row, the `formStack` empty-state branch, and the existing 3 muted lines
  (Payer/Requester, Attachments, Due/Updated/Freshness) are all unchanged. No new helper
  component, no `<AssigneeMutedLine>` extraction, no new column slot, no new section
  divider.

- Test coverage:
  - `apps/api-v2/src/admin-v2/payments/admin-v2-payments.service.spec.ts` — added one
    new `it('decorates payment operations queue items with the active assignee via
    getActiveAssigneesForResource', ...)` block in the existing
    `describe('AdminV2PaymentsService', ...)` adjacent to the two pre-existing
    `getPaymentOperationsQueue` tests. Inline mocks (no `createService` factory exists
    in this spec; introducing one is out of scope per
    `Decision: spec-test boundary one new behavioural test plus minimum fixture-fix`):
    `paymentRequestModel.findMany` returns `payment-A` in the overdue bucket (call 1)
    and `payment-B` in the stale-recipient-approval bucket (call 3); the other three
    `Promise.all` entries return `[]`. `assignmentsService.getActiveAssigneesForResource`
    is mocked to return `Map<'payment-A', AdminRef>` leaving `payment-B` unassigned.
    Asserts:
    1. `overdue_requests` first item `assignedTo: { id: 'admin-7', name: null,
       email: 'ops7@example.com' }`.
    2. `stale_waiting_recipient_approval` first item `assignedTo: null`.
    3. `getActiveAssigneesForResource` called exactly once with
       `('payment_request', expect.arrayContaining(['payment-A', 'payment-B']))`.
       No order assertion on the second argument since `Set` iteration order is
       implementation-defined.
  - The two pre-existing `getPaymentOperationsQueue` tests had their service constructor
    second argument widened from `{} as never` to
    `{ getActiveAssigneesForResource: jest.fn(async () => new Map()) } as never` — the
    minimum fixture fix required so the runtime
    `this.assignmentsService.getActiveAssigneesForResource(...)` call resolves. No new
    behavioural assertions on those tests; the new field's contract is covered by the
    dedicated test above.
  - `apps/admin-v2/src/app/(shell)/payments/operations/page.test.tsx` — extended its
    five inline mocked items (one per bucket) with `assignedTo: null` to satisfy the
    widened `mockResolvedValue<typeof AdminApi>` typing. **No populated `AdminRef`
    fixture row was added**: per Required Delta line 142 ("…and at least one populated
    `AdminRef` if the test currently asserts on rendered text — otherwise `null` on
    all rows is sufficient"), and the page test does not assert on assignee-related
    rendered text. The conditional was deliberately resolved by null-only because the
    backend spec already covers the new field's contract end-to-end. No new behavioural
    assertions on the page test.

- Frozen workspaces and surfaces (zero diff confirmed against the slice range):
  `apps/api/ workspace frozen`, `apps/admin/ workspace frozen`,
  `apps/api-v2/src/consumer/ workspace frozen`,
  `apps/api-v2/src/admin-v2/assignments/ frozen (helper consumed not modified)`,
  `apps/admin-v2/src/components/assignment-card.tsx` (frozen since 3.6b),
  `apps/admin-v2/src/lib/admin-mutations.server.ts`,
  `apps/api-v2/src/admin-v2/payments/admin-v2-payments.controller.ts`,
  `apps/api-v2/src/admin-v2/payments/admin-v2-payments.module.ts`,
  `packages/database-2/prisma/schema.prisma`, and
  `packages/database-2/prisma/migrations/`. The bucket-of-cards twin
  `apps/admin-v2/src/app/(shell)/payouts/page.tsx` was deliberately not touched
  (`payouts list assignment surfacing out of scope`; remains a future single-page slice
  per the `Decision: payouts not absorbed remains separate 3.7d-candidate slice`).
  Sibling list pages also remain frozen on this slice:
  `payments list assignment column out of scope`,
  `ledger list assignment column out of scope`,
  `ledger anomalies list assignment column out of scope`. Companion mutation/affordance
  deferrals: `assignee filter out of scope`, `assignee sort out of scope`,
  `claim from list affordance out of scope`.

## Verification

Required commands (all PASS):

- `yarn verify:admin-v2-gates` — pre-commit reconciliation gate PASS on each commit
  (gate auto-runs as part of the pre-commit hook on admin-v2-scoped commits and reports
  `[admin-v2-gates] local checks passed`).
- `rtk typecheck:v2-apps` — `@remoola/admin-v2` and `@remoola/api-v2` both OK.
- `rtk typecheck` — repo-wide PASS.
- `yarn workspace @remoola/api-v2 run test --testPathPatterns admin-v2-payments` —
  `7/7` PASS, including the new `decorates payment operations queue items with the
  active assignee via getActiveAssigneesForResource` test and the two pre-existing
  `getPaymentOperationsQueue` tests under the widened constructor shape.
- `rtk test:v2-apps` — `1234/1234` PASS across the four v2 workspaces.

Diff-stat invariants (verified against the slice range):

- `apps/admin-v2/src/lib/admin-api.server.ts` — additive only: one new line
  (`assignedTo: AdminRef | null;`) appended last in the items shape. No other
  type widened. No import added (forward type reference to the same module's existing
  `AdminRef` export).
- `apps/api-v2/src/admin-v2/payments/admin-v2-payments.service.ts` — diff bounded to:
  one widened import (`type AdminRef` added to the existing
  `AdminV2AssignmentsService` import line); one optional parameter added to
  `mapPaymentOperationsQueueItem` plus `assignedTo` appended in its return; one new
  `getActiveAssigneesForResource` call inside `getPaymentOperationsQueue`; one new
  `Set<string>` ID collection block; the 5 per-bucket mappings updated to thread the
  assignee. No edits to `where`, `orderBy`, `take`, `select`, the `Promise.all` shape,
  the `posture` object, the bucket keys/labels/operatorPrompts, or `generatedAt`.
- `apps/admin-v2/src/app/(shell)/payments/operations/page.tsx` — additive only: 11
  inserted lines for the new muted paragraph at the bottom of the card body. No edit
  to `renderConsumerLink`, `formatDate`, `pageHeader`, the `Back to payments` link,
  the bucket pill row, or the empty-state branch.
- `apps/api-v2/src/admin-v2/assignments/admin-v2-assignments.service.ts` — **zero
  diff** (consumed unmodified).
- `apps/api-v2/src/admin-v2/payments/admin-v2-payments.controller.ts`,
  `apps/api-v2/src/admin-v2/payments/admin-v2-payments.module.ts` — zero diff.
- `apps/admin-v2/src/app/(shell)/payments/operations/page.test.tsx` — minimum
  fixture-fix only (5 × `assignedTo: null` appended on existing mocks). No assertion
  added.
- `apps/api-v2/src/admin-v2/payments/admin-v2-payments.service.spec.ts` — additive
  diff bounded to: two existing-test constructor-arg widenings + one new `it(...)`
  block. No edits to the other 4 pre-existing tests.
- `packages/database-2/prisma/` — zero diff (`no new prisma migrations`).
- `apps/api/`, `apps/admin/`, `apps/api-v2/src/consumer/` — zero diff.

Visual / behavioural:

- The `/payments/operations` queue renders the new "Assigned to" line as the last muted
  line inside each `<article className="panel">` card across all 5 buckets. Cards with
  no active assignment render `Assigned to: —` (muted em-dash). Cards with an active
  assignment render `Assigned to: <name|email|id>` with the `email` appended as a muted
  suffix when present (mirroring verification/exchange-scheduled/documents cell content
  family-byte-equivalent).
- Row click-through (`/payments/[paymentRequestId]`), the bucket pill counts, the
  `Back to payments` link, the `Persisted: … · Effective: …` per-card line, the
  `followUpReason` paragraph, and the empty-state branch are all unchanged.

## Decisions

- `Decision: bucket-of-cards renders assignee as one extra muted line not a pseudo-column`
  — the bucket-of-cards layout (`apps/admin-v2/src/app/(shell)/payments/operations/page.tsx`)
  has no `<table>` and no `<th>` to extend. The single-table family precedent
  (verification, exchange/scheduled, documents) added a `<th>Assigned to</th>` cell;
  there is no equivalent affordance here. Three rendering options were available:
  (1) one extra muted `<p>` line inside the existing card body, (2) a pseudo-column
  rendered as a card-footer chip or pill, (3) a structured "card meta" row alongside
  the existing pill row. Option (1) was chosen because it is the lowest blast radius
  for first-of-rendering-family precedent (one JSX line per card, no new component, no
  layout decision that future bucket-of-cards consumers must inherit beyond "append a
  muted line"), it preserves the existing reading flow ("what is this case → why is it
  on the queue → who/when context → who owns the case"), and it minimises the diff to
  the existing muted-line ordering. `/payouts` is the natural future consumer that will
  reuse this precedent (see Discovered while exploring): when 3.7d-class work touches
  `/payouts`, the same `<p className="muted">Assigned to: …</p>` line should appear at
  the end of each card body in both the main bucket loop and the `highValueItems`
  overlay bucket (the second touch site that distinguishes `/payouts` from
  `/payments/operations`).

- `Decision: single bulk call with deduplicated resourceIds Set` — the bulk lookup
  runs **once per request** with a single deduplicated `resourceIds` array that
  contains the IDs of every item across all 5 final buckets. A `Set<string>` is used
  to dedupe before passing to the helper because `inconsistentItems` and
  `missingAttachmentItems` source rows from larger over-fetched arrays
  (`take: LIMIT_PER_BUCKET * 3`) and items can in principle appear in more than one
  bucket. The naive alternative — calling `getActiveAssigneesForResource` 5× (once
  per bucket) — was rejected because it would produce 5× the assignment query cost
  for no observable correctness gain and would defeat the bulk helper's purpose.

- `Decision: thread assignee via mapPaymentOperationsQueueItem optional parameter` —
  `mapPaymentOperationsQueueItem` is extended with `assignedTo: AdminRef | null = null`
  (default null) rather than a separate post-processing pass. Simple buckets pass the
  resolved value directly through the helper; the inconsistent/missing buckets use a
  trailing `.map((item) => ({ ...item, assignedTo: assigneeMap.get(item.id) ?? null }))`
  to re-thread the assignee after their existing intermediate pipeline, since the
  pipeline filters/slices on the post-helper item shape and the post-pipeline ids are
  the ones that must be threaded. This pattern (helper-default-null + trailing
  re-thread for filtered buckets) is the minimum-diff shape that honours both the
  handoff invariant ("no over-fetch, no under-fetch, no duplicate row in the helper
  input") and the existing bucket-pipeline shape.

- `Decision: spec-test boundary one new behavioural test plus minimum fixture-fix` —
  the service spec gains exactly one new `it(...)` block (the assignee threading
  contract) and the two pre-existing `getPaymentOperationsQueue` tests have their
  constructor second argument widened to a no-op assignments-service mock returning
  `new Map()`. No `createService` factory was introduced (no factory exists in this
  spec today; introducing one is a refactor outside this slice's scope). The page
  test gains zero new assertions (only the fixture-shape neutralization with
  `assignedTo: null`); the backend spec is the single source of truth for the new
  field's contract.

- `Decision: payouts not absorbed remains separate 3.7d-candidate slice` —
  `/payouts` is the second bucket-of-cards page. The `MVP-3.7b` `Follow-ups` reserve
  it as "a single bucket-of-cards-pattern slice once a column-slot rendering pattern
  is designed" **and also** as "separate single-page slices, each with its own
  risk-class assessment". Both reservations are honoured: this slice ships the
  cell-shape decision (not a column-slot pattern but a muted-line append; the first
  reservation is no longer gating since the rendering shape is now set), but
  `/payouts` is **not absorbed** because it has an extra render mode (the
  `highValueItems` overlay bucket renders cards in a separate top section before the
  bucket loop), so its touch-site count is 2 not 1, and a separate single-page slice
  with its own risk-class assessment lets the `highValueItems` overlay be evaluated
  as a distinct touch site. `/payouts` is therefore the natural 3.7d-candidate.

- `Decision: assignee placement at end of card body after Due / Updated / Freshness`
  — the card body has a fixed muted-line order today: `Payer / Requester` →
  `Attachments` → `Due / Updated / Freshness`. The `pageHeader`-row content is `id`
  + `amount/currency/rail` (left) and `Persisted/Effective` (right). The
  `followUpReason` paragraph sits between `pageHeader` and the muted lines.
  Appending the assignee as the last muted line preserves the existing reading flow
  ("what is this case → why is it on the queue → who/when context → who owns the
  case"), minimises diff to the existing muted-line ordering, and matches the
  mental model of "operational ownership is the last metadata line you read before
  clicking through to the case". Inserting the line between existing muted lines
  was rejected (would force eye-travel reorder); promoting the line above the
  `followUpReason` paragraph was rejected (would push case-justification context
  below ownership context).

## Discovered while exploring

Two bucket-of-cards pages exist in admin-v2:
`apps/admin-v2/src/app/(shell)/payments/operations/page.tsx` (this slice's target)
and `apps/admin-v2/src/app/(shell)/payouts/page.tsx`. They share the bucket-of-cards
render mode but not their full structure: `/payouts` adds an extra `highValueItems`
overlay bucket that renders cards in a separate top section before the bucket loop,
so the touch-site count is 2 (overlay bucket + main bucket loop) rather than 1.
This single-touch-site-vs-two-touch-site asymmetry is the reason this slice does not
absorb `/payouts` despite both pages sharing the rendering family — see
`Decision: payouts not absorbed remains separate 3.7d-candidate slice`. The
cell-shape decision in this slice ("append one extra muted line, no card-footer
chip, no pseudo-column") is reusable by `/payouts` byte-for-byte; only the touch
sites multiply, not the cell rendering.

The post-pipeline-vs-pre-pipeline ID collection trade-off was considered: a
pre-pipeline strategy would collect `resourceIds` from the raw `findMany` result
arrays before the inconsistent/missing filters and slices apply, then bulk-fetch
assignees, then thread them. This was rejected: the simple buckets'
`take: LIMIT_PER_BUCKET` already matches the post-pipeline result, but the
inconsistent and missing-attachment buckets `take: LIMIT_PER_BUCKET * 3` (over-fetch
to compensate for the post-`findMany` filter discarding rows). A pre-pipeline
strategy would fetch assignees for up to `2 * LIMIT_PER_BUCKET * 2` rows that the
filter then drops, wasting the bulk-helper query budget on rows that never appear in
the response. Post-pipeline collection guarantees the helper input is exactly the set
of `id`s actually emitted in the response (modulo the `Set` deduplication of the
rare cross-bucket repeat), which is the minimal correct query shape.

The 3.7b `Follow-ups` bullet "Performance audit on
`operational_assignment(resource_type, resource_id, released_at)` remains deferred
… an index audit only becomes necessary if a high-cardinality list page (e.g.
ledger) adopts the column" was re-evaluated against this slice's load. This slice
is the **fourth** bulk consumer of `getActiveAssigneesForResource`. The
operations-queue page is bounded (5 × `LIMIT_PER_BUCKET = 25` items per request,
maximum 125 ids fanned into a single `WHERE resource_id = ANY(...)` clause), but
the cumulative bulk-lookup load is now distributed across four list pages
(verification, exchange-scheduled, documents, payments-operations). The deferral
condition in 3.7b ("becomes necessary if a high-cardinality list page adopts the
column") still nominally holds — `payments-operations` is bounded, not
high-cardinality — but the cumulative load delta is large enough that the audit
should now be scheduled before the next adopter rather than after, and the next
adopter `/payouts` is on the immediate horizon.

## Deviations

- `Deviation: handoff-README LANDED-move skipped` — the slice handoff body
  (`admin-v2-handoff/SLICE-MVP-3.7c-list-surface-assignee-payments-operations.md`,
  `Reconciliation` section, "after the slice merges" task) calls for moving the
  3.7c handoff entry into `admin-v2-handoff/README.md` `## Landed` (or
  equivalently, into `admin-v2-handoff/LANDED.md` `## Landed slices` per the
  recent split). This step was **intentionally skipped** for this slice because
  the working tree contains a pending policy change that reclassifies the entire
  `admin-v2-handoff/` directory as personal scratch (not for commit) via an
  unstaged `.gitignore` addition (`# admin-v2 handoff/pack — personal scratch,
  не для commit` followed by `admin-v2-handoff/`, `admin-v2-pack/`,
  `admin-v2-planning-input.md`); the previous `admin-v2-handoff/README.md` is
  already staged for deletion in the index, consistent with that policy.
  Performing the README LANDED-move now would either be invisible (post-ignore)
  or produce a dirty `D+M` index state that conflates this slice with the
  unrelated cross-cutting policy change. The canonical in-tree landing record
  for this slice is therefore the present reconciliation note
  (`docs/admin-v2-mvp-3.7c-list-surface-assignee-payments-operations.md`),
  registered in `scripts/admin-v2-gates/config.mjs` `CHECK_PATHS` and
  `RECONCILIATION_NOTES`. This deviation is scoped to 3.7c only and does not
  set a precedent for future slices: subsequent slices should inherit whatever
  treatment the `admin-v2-handoff/` directory ultimately receives once the
  pending `.gitignore` policy change is committed (or reverted) by a separate
  cross-cutting cleanup.

## Follow-ups

- Re-evaluate `/payouts` list-surface assignee surfacing as a separate single-page
  slice using this slice's cell-shape decision as precedent (account for the
  `highValueItems` overlay bucket as an additional touch site).
- Re-evaluate `/payments`, `/ledger`, `/ledger/anomalies` as separate
  responsive-triple-render slices, each with its own risk-class assessment.
- Performance index audit on `operational_assignment(resource_type, resource_id,
  released_at)` is now on the immediate horizon (this slice is the fourth bulk
  consumer); evaluate before the fifth bulk consumer (`/payouts`) lands. This
  closes the conditional deferral logged in 3.7b's `Follow-ups`
  (`performance index audit on operational_assignment(resource_type, resource_id, released_at) flagged as immediate-horizon follow-up`)
  and is logged here as a standalone hygiene task to be picked up before any
  further bulk-helper consumer ships, independent of this slice.
- `Closed follow-up: payments operations list assignment column` — the
  `MVP-3.7a`/`MVP-3.7b` `payments operations list assignment column out of scope`
  deferral closes with this slice.
