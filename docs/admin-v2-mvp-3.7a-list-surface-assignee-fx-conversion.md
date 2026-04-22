# Slice MVP-3.7a — List-surface assignee column for `fx_conversion` (exchange/scheduled)

## Summary

`MVP-3.7a` is a strictly additive `list-surface assignee column` slice that extends the
operational-assignment surface from per-resource case pages onto the **first non-verification
list page** (`exchange scheduled list page`, `apps/admin-v2/src/app/(shell)/exchange/scheduled/page.tsx`).
It is the first member of the new family "non-verification list-surface assignee column" and the
first slice of `'fx_conversion' resourceType list extension` after the case-page activation
landed in `3.6e`. The slice ships exactly one new column on exactly one list page; six sibling
list pages are intentionally deferred.

Hard rules upheld end-to-end: `no new prisma migrations` (the `'fx_conversion'` value was
already in the DB `CHECK` and `ASSIGNABLE_RESOURCE_TYPES` after `3.6e`), `no new capability`
(reuses `exchange.read`), `no new audit action` (read-only surface; no write happens),
`no new endpoint` (`GET /admin-v2/exchange/scheduled?...` widened additively), and `no new DTO`.

## Implemented

- `additive ExchangeScheduledListResponse field` — extended the `items[]` shape inside
  `ExchangeScheduledListResponse` (`apps/admin-v2/src/lib/admin-api.server.ts:593-625`) with
  `assignedTo: AdminRef | null` as the **last** field (`assignedTo field appended last`,
  after `updatedAt`). Reuses the already-exported `AdminRef` from `admin-api.server.ts:1047`;
  no parallel `AdminRef` import is introduced. The `getExchangeScheduledConversions` BFF
  function signature is unchanged.

- `private getActiveAssignees in AdminV2ExchangeService` — added a private
  `inline copy bulk getActiveAssignees(resourceIds: string[]): Promise<Map<string, AdminRef>>`
  inside `AdminV2ExchangeService` (`apps/api-v2/src/admin-v2/exchange/admin-v2-exchange.service.ts`).
  The helper mirrors the verification helper at
  `apps/api-v2/src/admin-v2/verification/admin-v2-verification.service.ts:260-277` with the
  `resource_type` literal hardcoded to `'fx_conversion'`, joins `admin` on `assigned_to` for
  `email`, returns `{ id, name: null, email }` per row, and uses parameterised
  `Prisma.sql\`...\`` (no string interpolation of `resourceIds`; the array is passed as
  `${resourceIds}::uuid[]` through `prisma.$queryRaw`).

- Wired the helper into `listScheduledConversions`: after the existing `findMany` and
  `loadLedgerEntryMap` lookups, the service computes
  `const assigneeMap = await this.getActiveAssignees(conversions.map((c) => c.id));` and
  passes it as the third argument into `mapScheduledListItem`. The `mapScheduledListItem`
  parameter shape change is the addition of `assigneeMap: Map<string, AdminRef>` after the
  existing `ledgerEntryMap` parameter; the returned object appends
  `assignedTo: assigneeMap.get(conversion.id) ?? null` as the last field.

- `single-table render mode (no responsive triple-render touched)` — added one
  `<th>Assigned to</th>` between `<th>Status</th>` and `<th>Timing</th>` in the single
  `<table>` on `apps/admin-v2/src/app/(shell)/exchange/scheduled/page.tsx`, plus the matching
  `<td>` cell that renders `item.assignedTo ? (<><div>{name ?? email ?? id}</div>{email ? <div className="muted">{email}</div> : null}</>) : (<span className="muted">—</span>)`,
  mirroring `apps/admin-v2/src/app/(shell)/verification/page.tsx:391-399` exactly.
  The new column appears between "Status" and "Timing" and the `colSpan` of the empty-state
  row was bumped from `5` to `6`. Row click-through is unchanged: rows still link to
  `/exchange/scheduled/[conversionId]`.

- `54.2KB exchange-service scope guard` honoured: net additions to
  `admin-v2-exchange.service.ts` are 24 insertions / 2 deletions = 22 net additions, well
  within the `≤25 LOC additive scope guard preserved` cap. Touched only
  `listScheduledConversions`, `mapScheduledListItem`, and the new helper. The `Promise.all`
  deviation note from `3.6e` is not reopened: the new bulk lookup runs sequentially after
  `findMany` + `loadLedgerEntryMap`, consistent with the prior diff-size-over-shape decision.

- `verification surface frozen` — `apps/api-v2/src/admin-v2/verification/admin-v2-verification.service.ts`
  shows zero diff at end of slice. The existing `private getActiveAssignees` is left exactly
  as-is (`Decision: AdminV2VerificationService.getActiveAssignees not refactored`). The
  verification list page (`apps/admin-v2/src/app/(shell)/verification/page.tsx`) is also
  untouched.

- `AdminV2AssignmentsService public surface unchanged` — no change to
  `apps/api-v2/src/admin-v2/assignments/admin-v2-assignments.service.ts`,
  `admin-v2-assignments.controller.ts`, `admin-v2-assignments.module.ts`, or the assignments
  DTO. The bulk lookup remains private to its consumer service; sharing/extraction is
  deferred to a future slice when a third consumer arrives
  (`Decision: bulk helper extraction trigger deferred to third consumer`).

- Frozen workspaces (zero diff confirmed): `apps/api/ workspace frozen`,
  `apps/admin/ workspace frozen`, `apps/api-v2/src/consumer/ workspace frozen`.

- Sibling-list deferrals (each kept as a single-page slice with its own evidence pass):
  `documents list assignment column out of scope`,
  `payouts list assignment column out of scope`,
  `payments list assignment column out of scope`,
  `payments operations list assignment column out of scope`,
  `ledger list assignment column out of scope`,
  `ledger anomalies list assignment column out of scope`. These are tracked under the
  follow-up bullet below; the rationale per page is captured in §"Discovered while
  exploring" (three risk classes). Companion mutation/affordance deferrals also remain
  out of scope: `assignee filter out of scope`, `assignee sort out of scope`, and
  `claim from list affordance out of scope`.

- Test coverage: added one focused assertion in
  `apps/api-v2/src/admin-v2/exchange/admin-v2-exchange.service.spec.ts` using the existing
  `createService` factory. The test mocks `prisma.scheduledFxConversionModel.findMany` to
  return two rows and `prisma.$queryRaw` to return one assignment row for the first id
  only, then asserts `result.items[0].assignedTo` equals an `AdminRef` matching the mocked
  admin and `result.items[1].assignedTo` equals `null`. It also asserts that
  `prisma.$queryRaw` is called exactly once (single bulk lookup, not per-row).

## Verification

Required commands (all PASS):

- `yarn verify:admin-v2-gates` — pre-commit and post-commit reconciliation gate PASS.
- `yarn typecheck:v2-apps` — `@remoola/admin-v2`, `@remoola/api-v2`, `@remoola/consumer-css-grid` all OK.
- `yarn lint:admin-v2`, `yarn lint:api-v2` — 0 warnings.
- `yarn workspace @remoola/api-v2 run test --testPathPatterns='admin-v2-exchange.service'`
  — 9/9 tests PASS, including the new
  `exposes assignedTo: AdminRef | null on listScheduledConversions items via bulk getActiveAssignees`.
- `yarn workspace @remoola/admin-v2 run test` — PASS.

Diff-stat invariants (verified against `HEAD~..HEAD` ranges that include this slice):

- `apps/api-v2/src/admin-v2/exchange/admin-v2-exchange.service.ts` — `24` insertions /
  `2` deletions (22 net additions). Within `≤25 LOC additive scope guard preserved`.
- `apps/api-v2/src/admin-v2/verification/admin-v2-verification.service.ts` — zero diff.
- `apps/api-v2/src/admin-v2/assignments/` — zero diff in `service.ts`, `controller.ts`,
  `module.ts`, and the DTO.
- `packages/database-2/prisma/` — zero diff (`no new prisma migrations`).

Visual / behavioural:

- The list page renders the new "Assigned to" column between "Status" and "Timing"; row
  click-through (`/exchange/scheduled/[conversionId]`) and pagination are unchanged.
- The empty-state row spans the new column count (`colSpan={6}`).

## Decisions

- `Decision: inline copy over shared helper extraction` — `getActiveAssignees` is added as
  a private method inside `AdminV2ExchangeService`, hardcoded for `'fx_conversion'`. It is
  not promoted onto `AdminV2AssignmentsService`. Reasoning: the bulk-lookup pattern now has
  exactly two consumers (verification + exchange). The third-consumer trigger that promoted
  the case-page helper in `3.6b` (`Decision: shared helper extraction over inline copy`) has
  not yet fired for the bulk variant. Mirrors the explicit `3.6a` token
  `Decision: inline copy over shared helper extraction` and the family invariant of "promote
  on third consumer, not on second". Forking the helper here keeps the verification surface
  at zero diff on a 50+ KB hot path and keeps the `54.2KB exchange-service scope guard`
  honoured. The third bulk consumer (e.g. documents list, when it ships) is the natural
  reopening point for `Decision: bulk helper extraction trigger deferred to third consumer`.

- `Decision: AdminV2VerificationService.getActiveAssignees not refactored` — explicitly not
  edited in this slice. The verification freeze is non-negotiable for `MVP-3.7a` per the
  handoff §"Slice-Specific Non-Negotiables".

- `Decision: assignedTo appended last to items shape` — the new field is appended after
  `updatedAt` rather than interleaved next to other consumer/identity fields. This mirrors
  the verification list precedent (`getVerificationQueue` items[].assignedTo at
  `admin-api.server.ts:1034`), minimises diff churn, and preserves snapshot stability for
  any consumer that reads field order.

- `Decision: exchange/scheduled chosen as safest single-table list page` — among the seven
  candidate list pages, `exchange/scheduled` is the only single-table, single-render-mode
  page (162 LOC) and is the resource type for which case-page assignment activation most
  recently landed (`3.6e`). It minimises touch sites to one `<th>` and one `<td>`, with no
  layout reflow and no responsive logic to touch.

- `Decision: payments/ledger deferred for responsive triple-render risk class` — both
  `apps/admin-v2/src/app/(shell)/payments/page.tsx` and
  `apps/admin-v2/src/app/(shell)/ledger/page.tsx` use a responsive triple-render layout
  (`3×` per-page touch sites: desktop table, tablet condensed table, mobile cards). Adding a
  column there in this slice would 3× the diff and require a separate column-slot pattern
  decision. Same applies to `apps/admin-v2/src/app/(shell)/ledger/anomalies/page.tsx`.

- `Decision: payouts/payments-operations deferred for bucket-of-cards layout (no column slot)`
  — `apps/admin-v2/src/app/(shell)/payouts/page.tsx` and
  `apps/admin-v2/src/app/(shell)/payments/operations/page.tsx` use a bucket-of-cards layout
  rather than a `<table>`. There is no natural "column slot" for an assignee field; the
  rendering pattern would have to be redesigned (e.g. as a card-footer chip), which is a
  novel pattern decision beyond the safe additive scope of this slice.

- `Decision: documents deferred to follow extraction trigger` — the documents list page
  (`apps/admin-v2/src/app/(shell)/documents/page.tsx`) uses a single `<ExplorerTable>`
  helper that wraps a single `<table>`. It is the second-safest candidate after
  `exchange/scheduled`, but landing it here would create the third bulk consumer in the
  same slice, which is exactly the trigger that should *initiate* extraction rather than
  expand the inline-copy footprint. Documents is therefore the ideal next slice: it both
  (a) absorbs a second-safest list-surface and (b) opens the natural reopening point for
  `getActiveAssigneesForResource(resourceType, resourceIds)` extraction onto
  `AdminV2AssignmentsService`.

- `Decision: F1 migration drift not absorbed`, `Decision: prisma format whitespace drift not absorbed`
  — neither pre-existing platform-hygiene drift fragment is touched by this slice. They
  remain bundled into `SLICE-PATCH-platform-hygiene-bundle` per its existing scope.

## Discovered while exploring

The seven candidate list pages split into three risk classes with materially different
per-page diff sizes, which justifies the one-page-per-slice posture for the rest of the
family:

1. **Single-table simple** (`1×` per-page touch site, ≤25 LOC additive shape):
   `exchange/scheduled` (this slice) and `documents` (next candidate). Both are 162-LOC
   class single `<table>` pages with a clear column slot. The exchange page is hand-rolled;
   the documents page goes through `<ExplorerTable>`.

2. **Bucket-of-cards** (no column slot): `payouts` and `payments/operations`. The current
   layout renders rows as cards grouped by status bucket. There is no `<th>` to add a
   column to; assignee surfacing here requires a novel card-footer chip pattern that is
   outside the additive scope of a list-surface slice.

3. **Responsive triple-render** (`3×` per-page touch sites, `3×` `colSpan` updates):
   `payments`, `ledger`, `ledger/anomalies`. Each renders the same data three different
   ways (desktop table, tablet condensed table, mobile cards). Adding the assignee column
   triples the per-page diff and triples the regression surface. Best landed as one
   focused slice per page with its own risk-class assessment.

The two helper invariants visible from current code: (a) every assignment-bearing list
shape uses the same `AdminRef = { id, name: null, email }` shape sourced from
`mapAdminRef` semantics, and (b) the SQL is always the same parameterised left-join on
`admin` filtered by `released_at IS NULL` and `resource_type = '<literal>'`. That gives a
clean target for the future shared bulk helper.

## Follow-ups

- When a third bulk consumer arrives (e.g. documents list), extract
  `getActiveAssigneesForResource(resourceType, resourceIds)` to
  `AdminV2AssignmentsService` and refactor verification + exchange to call it. At that
  point, `Decision: bulk helper extraction trigger deferred to third consumer` reopens and
  the verification helper can be deleted in the same slice (still preserving public-API
  shape via the new shared helper).
- Re-evaluate documents/payouts/payments-operations/payments/ledger/ledger-anomalies
  list-surface assignee columns in separate single-page slices, each with its own
  risk-class assessment per the three classes above. Recommended order: documents
  (single-table) → payments/ledger/ledger-anomalies (responsive triple-render, one slice
  each) → payouts/payments-operations (bucket-of-cards, only after a card-footer chip
  pattern is decided).
- Performance audit on `operational_assignment(resource_type, resource_id, released_at)`
  remains deferred. Current production load on the bulk lookup is dominated by
  `verification` (single-table page) and now `exchange/scheduled`; an index audit only
  becomes necessary if a high-cardinality list page (e.g. ledger) adopts the column.
- `claim from list affordance out of scope`, `assignee filter out of scope`, and
  `assignee sort out of scope` for this slice and remain deferred. They are independent
  product features; each warrants its own slice once usage data on the read-only column
  exists.
