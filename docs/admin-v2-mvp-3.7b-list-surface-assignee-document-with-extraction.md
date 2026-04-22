# Slice MVP-3.7b — `list-surface assignee column` for `document` (`documents list page`) with `bulk helper extraction`

## Summary

`MVP-3.7b` is a strictly additive `list-surface assignee column` slice that extends the
operational-assignment surface from per-resource case pages and the first list-page consumer
(`/exchange/scheduled` activated by 3.7a) onto the **second non-verification list page**:
`apps/admin-v2/src/app/(shell)/documents/page.tsx`. It is the first member of the new family
"non-verification list-surface assignee column" pattern's second consumer, and the first slice of
`'document' resourceType list extension` after the case-page activation landed in `3.6d`.

Because `document` is the **third bulk consumer** of the list-surface assignee shape (after
`verification` and `fx_conversion`), the family-precedent extraction trigger (3.6b for the
single-resource helper) fires now: this slice ships `bulk helper extraction` of the inline
`getActiveAssignees` SQL into a single shared public method `getActiveAssigneesForResource` on
`AdminV2AssignmentsService`, parameterised on `resourceType`, and refactors the prior two
consumers (verification + exchange) to delegate to it.

Hard rules upheld end-to-end: `no new prisma migrations` (the `'document'` value was already in
the DB `CHECK` after `3.6d`), `no new capability` (reuses `documents.read`), `no new audit action`
(read-only surface; no write happens), `no new endpoint`
(`GET /admin-v2/documents?...` widened additively in its response shape only), and `no new DTO`.

## Implemented

- `additive DocumentsListResponse field` — extended the `items[]` shape inside
  `DocumentsListResponse` (`apps/admin-v2/src/lib/admin-api.server.ts:395-413`) with
  `assignedTo: AdminRef | null` as the **last** field (`assignedTo field appended last`,
  after `linkedPaymentRequestIds`). Reuses the already-exported `AdminRef` from
  `admin-api.server.ts:1048`; no parallel `AdminRef` import is introduced. The
  `getDocuments` BFF function signature is unchanged.

- `AdminV2AssignmentsService public surface widened by one method` —
  `getActiveAssigneesForResource(resourceType: AssignableResourceType, resourceIds: string[]): Promise<Map<string, AdminRef>>`
  added as a new public method on `AdminV2AssignmentsService`
  (`apps/api-v2/src/admin-v2/assignments/admin-v2-assignments.service.ts:545-565`), placed
  adjacent to the canonical single-resource helper `getAssignmentContextForResource`. SQL
  shape: `SELECT a."resource_id"::text, a."assigned_to"::text, ad."email" FROM "operational_assignment" a LEFT JOIN "admin" ad ON ad."id" = a."assigned_to" WHERE a."resource_type" = ${resourceType} AND a."released_at" IS NULL AND a."resource_id" = ANY(${resourceIds}::uuid[])`.
  All parameters flow through `Prisma.sql` template substitution; there is **no string
  interpolation** of `resourceIds` (the array crosses the boundary as
  `${resourceIds}::uuid[]`). Returns a `Map<string, AdminRef>` keyed by `resource_id` text.
  No change to `AdminV2AssignmentsModule.exports`, `admin-v2-assignments.controller.ts`, or
  `admin-v2-assignments.dto.ts`.

- `verification inline getActiveAssignees removed` — the byte-equivalent inline
  `private async getActiveAssignees(resourceIds)` in
  `apps/api-v2/src/admin-v2/verification/admin-v2-verification.service.ts` (previously at lines
  `260-277`) was deleted and the existing `getQueue` callsite re-pointed to
  `await this.assignmentsService.getActiveAssigneesForResource('verification', pageSlice.map((item) => item.id))`.
  Net delta on the verification service: negative LOC (~-15 lines, helper removed; one-line
  callsite unchanged in shape, slightly expanded for two-arg call). The unused
  `type AdminRef` import was removed from the `assignments` import alias. No other behavioural
  change; the `Map<string, AdminRef>` fanout shape and the per-item
  `assignedTo: assigneesByResourceId.get(item.id) ?? null` placement remain identical.

- `exchange inline getActiveAssignees removed` — the byte-equivalent inline
  `private async getActiveAssignees(resourceIds)` in
  `apps/api-v2/src/admin-v2/exchange/admin-v2-exchange.service.ts` (previously at lines
  `781-798`, added by `MVP-3.7a`) was deleted and the `listScheduledConversions` callsite
  (line `771` pre-slice) re-pointed to
  `await this.assignmentsService.getActiveAssigneesForResource('fx_conversion', conversions.map((conversion) => conversion.id))`.
  Net delta on the exchange service: negative LOC (~-15 lines, helper removed; callsite
  expanded by one line for the two-arg call). The
  `54.2KB exchange-service scope guard preserved`: net change to `admin-v2-exchange.service.ts`
  is a **negative** delta. The `mapScheduledListItem` parameter shape, the `Promise.all`
  shape, and the per-item `assignedTo: assigneeMap.get(conversion.id) ?? null` placement remain
  byte-equivalent to the post-3.7a state.

- `verification + exchange refactored to consume shared bulk helper` — both services now
  delegate the bulk lookup to `AdminV2AssignmentsService.getActiveAssigneesForResource`. The
  verification helper passes the literal resource type `'verification'`; the exchange helper
  passes `'fx_conversion'`. Both retain their existing `Map<string, AdminRef>` fanout shape
  on the response item arrays.

- Wired the helper into `listDocuments` in
  `apps/api-v2/src/admin-v2/documents/admin-v2-documents.service.ts`: after the existing
  `Promise.all([findMany, count])` resolves, the service computes
  `const assigneeMap = await this.assignmentsService.getActiveAssigneesForResource('document', items.map((resource) => resource.id));`
  and appends `assignedTo: assigneeMap.get(resource.id) ?? null` as the **last** field of each
  item returned by the existing `items.map(...)` mapping. Sequential-after-findMany is required
  because the bulk-lookup input is `items.map((r) => r.id)`. The `where`, `include`,
  `orderBy`, `skip`, `take`, `evidenceScopeWhere()`, and `_count` shape are unchanged.

- `single-table render mode (no responsive triple-render touched)` — added one
  `<th>Assigned to</th>` between `<th>Owners</th>` and `<th>Tags</th>` in the single
  `<table className="dataTable">` inside the `ExplorerTable` helper of
  `apps/admin-v2/src/app/(shell)/documents/page.tsx`, plus the matching `<td>` cell rendered
  exactly as
  `document.assignedTo ? (<><div>{document.assignedTo.name ?? document.assignedTo.email ?? document.assignedTo.id}</div>{document.assignedTo.email ? <div className="muted">{document.assignedTo.email}</div> : null}</>) : (<span className="muted">—</span>)`,
  mirroring `apps/admin-v2/src/app/(shell)/verification/page.tsx:391-399` byte-for-byte. The
  `documents list column placed between Owners and Tags`. The empty state remains a
  `<p className="muted">` (no `<tr><td colSpan>` row exists to update). The `Select`
  checkbox column behaviour, the `bulkTagDocumentsAction` form wiring, and the `canManage`
  branching are unchanged.

- Test coverage:
  - `apps/api-v2/src/admin-v2/documents/admin-v2-documents.service.spec.ts` — added one new
    `it('decorates list rows with the active assignee via getActiveAssigneesForResource(\'document\', ids)', ...)`
    block and extended the two pre-existing list-shape `toEqual` assertions to include
    `assignedTo: null`. The new test mocks
    `assignmentsService.getActiveAssigneesForResource` to return a `Map` keyed on `'doc-1'`
    only, and asserts (a) `result.items[0].assignedTo` deeply equals
    `{ id: 'admin-9', name: null, email: 'ops9@example.com' }`, (b)
    `result.items[1].assignedTo` is `null`, and (c) the bulk helper was called once with
    `('document', ['doc-1', 'doc-2'])`.
  - `apps/api-v2/src/admin-v2/verification/admin-v2-verification.service.spec.ts` —
    retargeted the existing `it('decorates queue rows with the active assignee when an assignment exists', ...)`
    block: dropped the local `$queryRaw: queryRaw` mock, added a sibling
    `getActiveAssigneesForResource` to the assignments-service mock, and replaced
    `expect(queryRaw).toHaveBeenCalled()` with
    `expect(getActiveAssigneesForResource).toHaveBeenCalledWith('verification', ['consumer-1', 'consumer-2'])`.
    The pre-existing SLA test was updated to add the `getActiveAssigneesForResource` sibling
    mock so the queue path resolves a `Map`.
  - `apps/api-v2/src/admin-v2/exchange/admin-v2-exchange.service.spec.ts` — retargeted the
    existing `it('exposes assignedTo: AdminRef | null on listScheduledConversions items via bulk getActiveAssignees', ...)`
    block: dropped the local `$queryRaw` override, parametrised
    `assignmentsService.getActiveAssigneesForResource` via the `createService({ overrides })`
    factory, and replaced `expect(prisma.$queryRaw).toHaveBeenCalledTimes(1)` with
    `expect(assignmentsService.getActiveAssigneesForResource).toHaveBeenCalledWith('fx_conversion', ['scheduled-1', 'scheduled-2'])`.

- Frozen workspaces (zero diff confirmed): `apps/api/ workspace frozen`,
  `apps/admin/ workspace frozen`, `apps/api-v2/src/consumer/ workspace frozen`. Documents
  case page (`/documents/[documentId]`), `documents tags page out of scope`,
  `apps/admin-v2/src/components/assignment-card.tsx`, and
  `apps/admin-v2/src/lib/admin-mutations.server.ts` are also unchanged.

- Sibling-list deferrals (each kept as a single-page slice with its own evidence pass):
  `payouts list assignment column out of scope`,
  `payments list assignment column out of scope`,
  `payments operations list assignment column out of scope`,
  `ledger list assignment column out of scope`,
  `ledger anomalies list assignment column out of scope`. Companion mutation/affordance
  deferrals also remain out of scope: `assignee filter out of scope`,
  `assignee sort out of scope`, `claim from list affordance out of scope`.

## Verification

Required commands (all PASS):

- `yarn verify:admin-v2-gates` — pre-commit and post-commit reconciliation gate PASS.
- `yarn typecheck:v2-apps` — `@remoola/admin-v2`, `@remoola/api-v2`, `@remoola/consumer-css-grid` all OK.
- `yarn lint:admin-v2`, `yarn lint:api-v2` — 0 warnings.
- `yarn workspace @remoola/api-v2 run test --testPathPatterns='admin-v2'` — PASS,
  including the new `decorates list rows with the active assignee via getActiveAssigneesForResource('document', ids)`,
  the retargeted verification-queue assignee test, and the retargeted
  exchange-scheduled-list assignee test.
- `yarn workspace @remoola/admin-v2 run test` — PASS.

Diff-stat invariants (verified against the slice range):

- `apps/api-v2/src/admin-v2/assignments/admin-v2-assignments.service.ts` — additive only
  (one new public method; no controller/module/DTO changes).
- `apps/api-v2/src/admin-v2/verification/admin-v2-verification.service.ts` — **negative net
  LOC delta** (private `getActiveAssignees` removed; callsite re-pointed; `AdminRef` import
  dropped).
- `apps/api-v2/src/admin-v2/exchange/admin-v2-exchange.service.ts` — **negative net LOC
  delta** (private `getActiveAssignees` removed; callsite re-pointed). The
  `54.2KB exchange-service scope guard preserved` watchpoint stays honoured.
- `apps/api-v2/src/admin-v2/documents/admin-v2-documents.service.ts` — additive diff bounded
  to `listDocuments` (one new `await this.assignmentsService.getActiveAssigneesForResource(...)`
  call + one new field appended to the items mapping).
- `apps/api-v2/src/admin-v2/assignments/admin-v2-assignments.controller.ts`,
  `admin-v2-assignments.module.ts`, `admin-v2-assignments.dto.ts` — zero diff.
- `packages/database-2/prisma/` — zero diff (`no new prisma migrations`).

Visual / behavioural:

- The `/documents` list page renders the new "Assigned to" column between "Owners" and
  "Tags". Row click-through (`/documents/[documentId]`), the `Select` checkbox column
  behaviour, the `bulkTagDocumentsAction` form wiring, the `consumerId` "Owners" linkage,
  the tag pill rendering, the `Access / size` cell, and pagination are unchanged.
- The empty state remains a `<p className="muted">No evidence-linked documents matched the current filters.</p>`.

## Decisions

- `Decision: shared bulk helper extraction over third inline copy` — the bulk
  `getActiveAssignees(resourceIds)` shape now has three consumer sites
  (`verification`, `fx_conversion`, `document`). The third-consumer trigger that
  promoted the single-resource helper in `MVP-3.6b`
  (`Decision: shared helper extraction over inline copy`) fires here for the bulk variant.
  The new public `AdminV2AssignmentsService.getActiveAssigneesForResource(resourceType, resourceIds)`
  becomes the single source of truth; both prior inline copies are removed and both
  callsites delegate. This both honours the explicit `MVP-3.7a` `Follow-ups` bullet
  ("When a third bulk consumer arrives (e.g. documents list), extract
  `getActiveAssigneesForResource(resourceType, resourceIds)` to `AdminV2AssignmentsService`
  and refactor verification + exchange to call it") and preserves the family invariant of
  "promote on third consumer, not on second".

- `Decision: parameterise on resourceType (canonical getAssignmentContextForResource precedent)`
  — the new method's signature
  `getActiveAssigneesForResource(resourceType: AssignableResourceType, resourceIds: string[])`
  mirrors the canonical single-resource helper
  `getAssignmentContextForResource(resourceType, resourceId)` already public on the same
  service. A per-type method shape (`getActiveAssigneesForVerification`,
  `getActiveAssigneesForFxConversion`, `getActiveAssigneesForDocument`) is rejected: it would
  fork on the wrong axis (caller, not parameter) and break the established naming precedent.

- `Decision: documents column placement between Owners and Tags` — the documents
  `ExplorerTable` has 5 base columns (`Document` / `Owners` / `Tags` / `Payment linkage` /
  `Access / size`). The "Owners" column shows the consumer (data ownership); the new
  "Assigned to" column shows the operational owner. Grouping the two
  people-information columns adjacent reduces eye travel and matches the existing reading
  flow ("what is this document about → who owns the data → who owns the case → how is it
  tagged → what is it linked to → what does it look like"). Right-end placement was rejected
  because it would visually decouple "Assigned to" from the related "Owners" column.

- `Decision: assignedTo appended last to items shape` — `assignedTo: AdminRef | null` is
  appended after `linkedPaymentRequestIds` rather than interleaved next to other identity
  fields. Mirrors the `MVP-3.7a` `assignedTo field appended last` precedent on
  `ExchangeScheduledListResponse` and the verification list precedent on
  `getVerificationQueue` items[].assignedTo (`admin-api.server.ts:1035` family). Minimises
  diff churn and preserves snapshot stability for any consumer reading the shape.

- `Decision: documents chosen as second-safest single-table list page` — among the seven
  candidate list pages, `documents` is the only single-table, single-render-mode page
  remaining after `exchange/scheduled` shipped in `MVP-3.7a`. It minimises touch sites to one
  `<th>` and one `<td>`, with no responsive layout to triple-render and no card-footer
  pattern to design. Documents was named in `MVP-3.7a`'s
  `Decision: documents deferred to follow extraction trigger` as the natural reopening point
  for `getActiveAssigneesForResource(resourceType, resourceIds)` extraction; this slice
  closes that deferral.

- `Decision: payments/ledger/ledger-anomalies deferred for responsive triple-render risk class`
  — `apps/admin-v2/src/app/(shell)/payments/page.tsx`,
  `apps/admin-v2/src/app/(shell)/ledger/page.tsx`, and
  `apps/admin-v2/src/app/(shell)/ledger/anomalies/page.tsx` use a responsive triple-render
  layout (`3×` per-page touch sites: desktop table, tablet condensed table, mobile cards).
  Adding a column there triples the diff and triples the regression surface. Best landed as
  one focused slice per page with its own risk-class assessment.

- `Decision: payouts/payments-operations deferred for bucket-of-cards layout (no column slot)`
  — `apps/admin-v2/src/app/(shell)/payouts/page.tsx` and
  `apps/admin-v2/src/app/(shell)/payments/operations/page.tsx` use a bucket-of-cards layout
  rather than a `<table>`. There is no natural "column slot" for an assignee field; the
  rendering pattern would have to be redesigned (e.g. as a card-footer chip), which is a
  novel pattern decision beyond the safe additive scope of this slice.

- `Decision: sequential-after-findMany lookup (input depends on findMany ids)` — the bulk
  lookup's input is `items.map((r) => r.id)`, only known after `findMany` resolves. Adding
  the new call inside the existing `Promise.all([findMany, count])` is impossible without a
  second `findMany({ select: { id: true } })` query, which would double the index pressure
  for no observable gain. Mirrors the verification queue and `MVP-3.7a` exchange-scheduled
  precedents.

- `Decision: F1 migration drift not absorbed`,
  `Decision: prisma format whitespace drift not absorbed` — neither pre-existing
  platform-hygiene drift fragment is touched by this slice. They remain bundled into
  `SLICE-PATCH-platform-hygiene-bundle` per its existing scope.

## Discovered while exploring

The remaining list-surface assignee column candidates split into two risk classes that
justify keeping the one-page-per-slice posture for the rest of the family:

1. **Bucket-of-cards** (no column slot): `payouts` and `payments/operations`. The current
   layout renders rows as cards grouped by status bucket. There is no `<th>` to add a
   column to; assignee surfacing here requires a novel card-footer chip pattern that is
   outside the additive scope of a list-surface slice.

2. **Responsive triple-render** (`3×` per-page touch sites, `3×` `colSpan` updates):
   `payments`, `ledger`, `ledger/anomalies`. Each renders the same data three different
   ways (desktop table, tablet condensed table, mobile cards). Adding the assignee column
   triples the per-page diff and triples the regression surface. Best landed as one focused
   slice per page with its own risk-class assessment.

The single-table simple class is now exhausted as a deferral pool: `verification` is the
originating page, `exchange/scheduled` shipped in `MVP-3.7a`, and `documents` ships in this
slice. No other single-table list pages remain in the admin-v2 surface.

## Follow-ups

- `Closed follow-up: documents list assignment column` — the `MVP-3.6d`/`MVP-3.7a`
  `Decision: documents list assignment column out of scope` deferral closes with this slice.
- `Closed follow-up: bulk helper extraction trigger deferred to third consumer` — the
  `MVP-3.7a` `Decision: bulk helper extraction trigger deferred to third consumer` deferral
  closes with this slice. The new public
  `AdminV2AssignmentsService.getActiveAssigneesForResource` is the canonical bulk helper for
  any future list consumer.
- Re-evaluate payouts / payments-operations list-surface assignee columns as a single
  bucket-of-cards-pattern slice once a column-slot rendering pattern is designed.
- Re-evaluate payments / ledger / ledger-anomalies list-surface assignee columns as separate
  responsive-triple-render slices, each with its own risk-class assessment.
- Performance audit on `operational_assignment(resource_type, resource_id, released_at)`
  remains deferred. Bulk-lookup load is now distributed across three list pages
  (verification, exchange-scheduled, documents); an index audit only becomes necessary if a
  high-cardinality list page (e.g. ledger) adopts the column.
- `claim from list affordance out of scope`, `assignee filter out of scope`, and
  `assignee sort out of scope` for this slice and remain deferred. They are independent
  product features; each warrants its own slice once usage data on the read-only column
  exists.
