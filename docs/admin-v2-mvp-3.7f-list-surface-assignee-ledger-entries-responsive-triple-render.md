# Slice MVP-3.7f — `list-surface assignee surfacing` for `ledger_entry` (`ledger entries list page`, `responsive-triple-render rendering family`, `second responsive-triple-render consumer`)

## Summary

`MVP-3.7f` is a strictly additive `list-surface assignee surfacing` slice that extends
the operational-assignment surface from per-resource case pages and the six already-landed
list-page consumers (`verification` originating, `/exchange/scheduled` from 3.7a,
`/documents` from 3.7b, `/payments/operations` from 3.7c, `/payouts` from 3.7d,
`/payments` from 3.7e) onto the **second responsive-triple-render list page**:
`apps/admin-v2/src/app/(shell)/ledger/page.tsx` for `?view=entries`. The page renders
the same `items[]` array three times via three sibling React components in the same file
— `LedgerEntriesMobileCards`, `LedgerEntriesTabletRows`, and `LedgerEntriesDesktopTable`
— each picked by CSS `[data-view="mobile"|"tablet"|"desktop"]`. This slice is therefore
the **second responsive-triple-render consumer** of the assignee-cell family at scale = 3
within a single page (3.7e on `/payments` was the prior responsive-triple-render
precedent at the same scale).

The cell content is fixed by
`apps/admin-v2/src/app/(shell)/verification/page.tsx:391-399` (mirrored byte-equivalently
in 3.7a, 3.7b, 3.7c, 3.7d, 3.7e). This slice mechanically applies that cell content to
all three render modes on `/ledger?view=entries` and is the **seventh bulk consumer of
getActiveAssigneesForResource** — the shared helper
`AdminV2AssignmentsService.getActiveAssigneesForResource('ledger_entry', resourceIds)`
extracted by 3.7b. The helper is consumed unmodified — no signature change, no
return-shape change, no SQL change.
`apps/api-v2/src/admin-v2/assignments/ frozen (helper consumed not modified)`.

Hard rules upheld end-to-end: `no new prisma migrations` (the `'ledger_entry'` value was
already in the DB `CHECK` after `3.6a`), `no new capability` (read-only surfacing on the
already-existing ledger entries list endpoint), `no new audit action` (read-only; no
write happens), `no new endpoint` (`GET /admin-v2/ledger/entries` widened additively in
its response shape only), `no new DTO` (`additive LedgerEntriesListResponse field`),
`no new helper extraction`, `no inline copy of bulk helper` (the helper is consumed
via the public surface; no inline `getActiveAssignees` copy is reintroduced in
`AdminV2LedgerService`), and `no decorateWithAssignees private helper extracted` (the
two return branches inline the post-map merge directly, mirroring 3.7e). The slice is a
pure `'ledger_entry' resourceType list extension` against the already-landed bulk helper
surface. Sibling methods on the same service are verifiably zero-diff:
`getLedgerEntryCase frozen`, `listDisputes frozen`, `getLedgerDisputeCase frozen`. The
neighbouring anomalies service is also frozen:
`apps/api-v2/src/admin-v2/ledger/anomalies/ frozen (separate slice)`.

## Implemented

- `additive LedgerEntriesListResponse field` — extended the
  `LedgerEntriesListResponse.items[]` shape inside
  `apps/admin-v2/src/lib/admin-api.server.ts:904-925` with
  `assignedTo: AdminRef | null` as the **last** field
  (`assignedTo field appended last`, after `dataFreshnessClass: string`). Reuses the
  already-exported `AdminRef` from `admin-api.server.ts:1053` via a forward type
  reference; no parallel `AdminRef` import is introduced. The forward-reference pattern
  matches the six sibling list-response shapes that all reference `AdminRef` from the
  same module before its declaration line. The `getLedgerEntries` BFF function signature
  is unchanged.

- `getActiveAssigneesForResource shared bulk helper consumed` — wired the existing
  public bulk helper (`AdminV2AssignmentsService.getActiveAssigneesForResource(resourceType,
resourceIds)`, landed in 3.7b at lines `545-565`) into `listLedgerEntries` inside
  `apps/api-v2/src/admin-v2/ledger/admin-v2-ledger.service.ts:149-340`. Because
  `listLedgerEntries` has **two return branches** (a status-filtered raw-SQL branch
  using `prisma.$queryRaw` to materialise `pageIds` and a default branch using
  `prisma.ledgerEntryModel.findMany`), the data-flow change follows
  `Shape A post-map merge applied in both return branches` (Decision 1):

  Branch A — status-filtered raw-SQL branch:
  1. The existing `pageIdRows` raw-SQL query, the in-memory `pageIds` slice, the
     follow-up `prisma.ledgerEntryModel.findMany({ where: { id: { in: pageIds } },
include })`, and the per-`pageIds` `positionById` re-sort all run unchanged.
  2. The existing `rows.map((row) => this.mapLedgerRow(row as LedgerListRow))` block is
     lifted out of the inline `return { items: rows.map(...), pageInfo: {...} }` shape
     into a named `const items = rows.map((row) => this.mapLedgerRow(row as LedgerListRow))`
     statement, byte-stable in body (no edit to per-item field shape).
  3. A `single bulk call per request per branch` runs immediately after the `items`
     mapping: `await this.assignmentsService.getActiveAssigneesForResource('ledger_entry',
items.map((item) => item.id))`. This is a `sequential-after-mapping lookup` because
     the helper's input is the post-`mapLedgerRow` `items` id set (which is also the
     exact set of ids that will be emitted in the response).
  4. A second `items.map((item) => ({ ...item, assignedTo: (assigneeMap.get(item.id) ??
null) as AdminRef | null }))` constructs `itemsWithAssignee` and the response returns
     `itemsWithAssignee` in the `items` field of `{ items, pageInfo }` instead of
     `items`.

  Branch B — default `findMany` branch:
  1. The existing `prisma.ledgerEntryModel.findMany({ where, include, orderBy:
[{createdAt: 'desc'}, {id: 'desc'}], take: limit + 1 })` runs unchanged.
  2. The existing `rows.slice(0, limit).map((row) => this.mapLedgerRow(row as
LedgerListRow))` block is lifted out of the inline `return` shape into a named
     `const items = rows.slice(0, limit).map(...)` statement, byte-stable in body.
  3. The same `single bulk call per request per branch` runs immediately after the
     `items` mapping with `('ledger_entry', items.map((item) => item.id))`.
  4. The same `itemsWithAssignee` post-map merge runs and is returned in the `items`
     field.

  Both branches return a single flat `items` array sourced from a single Prisma query
  (`findMany` in branch B; `findMany({ where: { id: { in: pageIds } } })` in branch A
  with pre-determined `pageIds`), so ids are unique by construction; **no `Set<string>`
  deduplication is required** for the helper input in either branch. This matches 3.7e's
  posture and contrasts with 3.7c's
  `getPaymentRequestQueueWithAssignmentBuckets` (which assembles items from five
  separate `findMany` queries and therefore needs a `Set` to dedupe cross-bucket
  repeats). The bulk helper is consumed once per request per branch (i.e. **up to twice
  per call** to `listLedgerEntries`, but **exactly once per return path**); no inline
  copy of the bulk helper is introduced inside `AdminV2LedgerService`; and **no
  `decorateWithAssignees` private helper was extracted** (the two post-map merges are
  inlined into each return branch, isolating the diff to one new `await` + one new
  `items.map(...)` + the `return` swap per branch). `mapLedgerRow body frozen` and the
  `LedgerListRow` type is unchanged.

  The constructor is byte-stable: `AdminV2LedgerService` already injected
  `AdminV2AssignmentsService` as the second positional parameter (since `MVP-3.6a`),
  and `AdminV2LedgerModule` already imported `AdminV2AssignmentsModule`; this slice
  introduces neither a new injection nor a new module import.

- The bulk helper's `Map<string, AdminRef>` returned shape, the `Prisma.sql` template
  parameterisation (no string interpolation of `resourceIds`; the array crosses the
  boundary as `${resourceIds}::uuid[]`), and the `LEFT JOIN admin` SQL inside
  `apps/api-v2/src/admin-v2/assignments/admin-v2-assignments.service.ts:545-565` are
  consumed exactly as 3.7b shipped them — no edit, no override, no shadowing
  (`apps/api-v2/src/admin-v2/assignments/ frozen (helper consumed not modified)`). No
  string-interpolation regression on `prisma.$queryRaw` is introduced. The
  `AdminV2AssignmentsService` public surface is widened by zero methods.

- `same-file LedgerEntryAssignedTo helper added` — added a tiny presentational helper
  `LedgerEntryAssignedTo({ entry }: { entry: LedgerEntryItem })` in
  `apps/admin-v2/src/app/(shell)/ledger/page.tsx`, placed in source order between the
  existing `LedgerEntryLinks` helper and the existing `DisputeLinks` helper (which
  mirrors the page's local-helper pattern of co-locating cell helpers next to
  `LedgerEntryLinks` and `DisputeLinks`). The helper renders the byte-equivalent
  `verification/page.tsx:391-399` cell content using `<span>` wrappers (so it composes
  cleanly inside a `<td>`, a `<div className="condensedRowMeta">`, and an inline
  `<div className="muted">…</div>` mobile line) and matches all six prior list-surface
  consumers' cell content byte-for-byte:

  ```tsx
  function LedgerEntryAssignedTo({ entry }: { entry: LedgerEntryItem }) {
    if (!entry.assignedTo) {
      return <span className="muted">—</span>;
    }

    return (
      <>
        <span>{entry.assignedTo.name ?? entry.assignedTo.email ?? entry.assignedTo.id}</span>
        {entry.assignedTo.email ? <span className="muted"> {entry.assignedTo.email}</span> : null}
      </>
    );
  }
  ```

  `cross-page AssigneeCell component extraction deferred` (Decision 4) — the helper is
  intentionally a same-file local helper adjacent to `LedgerEntryLinks` and
  `DisputeLinks` (the page's existing same-file-helper pattern for cell content shared
  across the three render modes). No `apps/admin-v2/src/components/<AssigneeCell>` is
  created and the six prior list pages are not refactored to consume it.

- Three render-site placements of `<LedgerEntryAssignedTo entry={entry} />` were
  applied, one per render component, each following its own render-mode precedent on
  the page (Decision 1):
  - `mobile-cards muted line placement` — `LedgerEntriesMobileCards` `queueCardBody`
    gains a new last muted line `<div className="muted">Assigned to:
<LedgerEntryAssignedTo entry={entry} /></div>` after the existing `Created:` muted
    line. The label-value inline form mirrors the page's three existing inline-labeled
    muted lines (`Persisted:`, `Disputes:`, `Created:`); `<div>` (not `<p>`) is used to
    mirror the sibling muted-line elements on this page.
  - `tablet-rows fifth condensedRowMeta block placement` — `LedgerEntriesTabletRows`
    gains a new fifth `<div className="condensedRowMeta"><LedgerEntryAssignedTo
entry={entry} /></div>` block after the existing four (links, status, amount-+-rail,
    disputes-+-created). The block is intentionally **unlabeled** to mirror the page's
    existing four `condensedRowMeta` blocks (the page does not label tablet-row blocks;
    no `Assigned to:` prefix is rendered here).
  - `desktop-table column inserted between Status and Amount` —
    `LedgerEntriesDesktopTable` gains a new `<th>Assigned to</th>` between
    `<th>Status</th>` and `<th>Amount</th>` in the `<thead>` row, and a matching
    `<td><LedgerEntryAssignedTo entry={entry} /></td>` between the Status `<td>` and
    the Amount `<td>` in the body. The new column order is `Ledger entry | Links |
Status | Assigned to | Amount | Disputes | Created` (7 columns; was 6 columns).
    `colSpan bumped 6 to 7 on desktop empty-state row` — the empty-state `<td
colSpan={6}>` was bumped to `<td colSpan={7}>`. This column-insertion site mirrors
    `/exchange/scheduled` (3.7a), `/documents` (3.7b) and `/payments` (3.7e)
    precedent ("Status → Assigned to → next domain cell").

  `formatDate`, `renderMetadata`, `LedgerEntryLinks`, `DisputeLinks`,
  `DisputeMetadataViewer`, the disputes-side render components
  (`DisputesMobileCards`, `DisputesTabletRows`, `DisputesDesktopTable`), the
  default-export `LedgerPage`, the `pageHeader`, the filter `<form>`, the `Apply` /
  `Reset` buttons, the `view` toggle, the `nextHref(...)` helper, and the empty-state
  copy are all unchanged.

- Test coverage:
  - `apps/api-v2/src/admin-v2/ledger/admin-v2-ledger.service.spec.ts` — extended the
    existing inline `assignmentsService` mock on the `applies amount-sign and createdAt
filters on ledger explorer` test (the only pre-existing test that reaches
    `listLedgerEntries`) with a sibling permissive default
    `getActiveAssigneesForResource: jest.fn(async () => new Map())`. This is the
    **minimum** fixture fix per
    `Decision: spec-test boundary per-test sibling default mock without buildService factory`.
    Existing tests that do NOT reach `listLedgerEntries` (the
    `uses latest outcome semantics on ledger case ...` test, the two
    `getLedgerEntryCase` assignment-history tests, and the two `listDisputes` tests)
    were untouched. Added one new
    `it('merges active assignee onto ledger entries via post-map bulk lookup', ...)`
    block adjacent to the existing `applies amount-sign …` test inside the existing
    `describe('AdminV2LedgerService', ...)`. The new test exercises the **default
    `findMany` branch** (no status filter; no `$queryRaw` mock fixture is added) by
    mocking `prisma.ledgerEntryModel.findMany` with two ledger-entry rows
    (`ledgerEntryIdAssigned` and `ledgerEntryIdUnassigned`) using the minimum field
    shape required by `mapLedgerRow`, mocks the helper to return `Map<assignedId,
AdminRef>` leaving the second row unassigned, and asserts: 1. `result.items[0]` is the assigned id with
    `assignedTo: { id: assigneeId, name: 'Alice', email: 'alice@example.com' }`. 2. `result.items[1]` is the unassigned id with `assignedTo: null`. 3. `getActiveAssigneesForResource` is called with `('ledger_entry',
[ledgerEntryIdAssigned, ledgerEntryIdUnassigned])`.

        No `buildService()` factory is introduced; mirrors the 3.7e/3.7c precedent.

  - All six pre-existing tests in this spec file
    (`uses latest outcome semantics on ledger case instead of earliest outcome`,
    `returns assignment.current populated with one history entry when the entry is actively assigned`,
    `returns null current and a released row in history when the only assignment is released`,
    `applies amount-sign and createdAt filters on ledger explorer`,
    `maps canonical disputeStatus metadata for standalone disputes surface`,
    `applies inclusive createdAt date filters on standalone disputes without changing cursor pagination`)
    remain unmodified beyond the per-test sibling-default fixture fix on the
    `applies amount-sign …` test, and pass after the slice: 7/7 PASS (6 pre-existing +
    1 new).

  - There is **no `page.test.tsx`** for `apps/admin-v2/src/app/(shell)/ledger/page.tsx`.
    No frontend fixture-fix is therefore required on this slice, and no new page-test
    file is introduced (consistent with the slice's "no new test surface" boundary and
    mirrors 3.7e on `/payments`).

- `Decision: F1 migration drift not absorbed`-style hygiene concerns are not in scope
  for this slice. `Decision: prisma format whitespace drift not absorbed`-style hygiene
  concerns are not in scope for this slice.

- Frozen workspaces and surfaces (zero diff confirmed against the slice range):
  `apps/api/ workspace frozen`, `apps/admin/ workspace frozen`,
  `apps/api-v2/src/consumer/ workspace frozen`,
  `apps/api-v2/src/admin-v2/assignments/ frozen (helper consumed not modified)`,
  `apps/api-v2/src/admin-v2/ledger/anomalies/ frozen (separate slice)`,
  `apps/admin-v2/src/components/assignment-card.tsx` (frozen since 3.6b),
  `apps/admin-v2/src/lib/admin-mutations.server.ts`,
  `apps/api-v2/src/admin-v2/ledger/admin-v2-ledger.controller.ts`,
  `apps/api-v2/src/admin-v2/ledger/admin-v2-ledger.module.ts`,
  `packages/database-2/prisma/schema.prisma`, and
  `packages/database-2/prisma/migrations/`. The `getLedgerEntryCase frozen` invariant
  is observable: the case-page assignment context still flows through
  `getAssignmentContextForResource('ledger_entry', ...)` and the case-page tests are
  byte-untouched. `listDisputes frozen` and `getLedgerDisputeCase frozen` likewise:
  the disputes-side service surface and the `/ledger?view=disputes` page render are
  observably zero-diff. Sibling list pages remain frozen on this slice:
  `disputes view out of scope (dispute resourceType not in allowlist)` and
  `ledger anomalies list assignment column out of scope`. Companion
  mutation/affordance deferrals: `assignee filter out of scope`,
  `assignee sort out of scope`, and `claim from list affordance out of scope`. The
  `consumer resourceType activation out of scope pending architectural design`
  deferral remains in force.

## Verification

Required commands (all PASS):

- `yarn verify:admin-v2-gates` — pre-commit reconciliation gate PASS on each commit
  (the new `docs/admin-v2-mvp-3.7f-list-surface-assignee-ledger-entries-responsive-triple-render.md`
  path is registered in `CHECK_PATHS` and every required token from this slice's handoff
  Reconciliation section is present verbatim in `RECONCILIATION_NOTES`).
- `yarn typecheck:v2-apps` — `@remoola/admin-v2` and `@remoola/api-v2` both OK.
- `yarn lint:admin-v2` and `yarn lint:api-v2` — 0 warnings.
- `yarn workspace @remoola/api-v2 run test --testPathPatterns='admin-v2-ledger.service.spec'`
  — `7/7` PASS, including the new
  `merges active assignee onto ledger entries via post-map bulk lookup`
  test and all six pre-existing tests under the per-test sibling-default fixture fix.

Diff-stat invariants (verified against the slice range):

- `apps/admin-v2/src/lib/admin-api.server.ts` — additive only: one new line
  (`assignedTo: AdminRef | null;`) appended last in the `LedgerEntriesListResponse.items[]`
  shape after `dataFreshnessClass: string;`. No other type widened. No import added
  (forward type reference to the same module's existing `AdminRef` export at line
  `1053`).
- `apps/api-v2/src/admin-v2/ledger/admin-v2-ledger.service.ts` — diff bounded to:
  one `import type { AdminRef }` clause widening on the existing
  `AdminV2AssignmentsService` import line (no new import statement); two new
  `getActiveAssigneesForResource` callsites inside `listLedgerEntries` (one per return
  branch, between the existing `items` mapping and the existing `pageInfo` cursor
  lookup); two new `itemsWithAssignee = items.map(...)` post-map merges that thread
  `(assigneeMap.get(item.id) ?? null) as AdminRef | null` per item; the two `return`
  swaps (`items` → `itemsWithAssignee`) inside the `{ items, pageInfo }` responses; two
  `const items = ...` lifts (extracting the existing inline `rows.(slice/map)(...)`
  blocks into named statements without editing their bodies). No edits to `where`,
  `orderBy`, `take`, `select`, `include`, the existing `mapLedgerRow` body, the
  raw-SQL `pageIdRows` query, the `pageInfo` blocks, the `getLedgerEntryCase` method,
  the `listDisputes` method, the `getLedgerDisputeCase` method, the constructor, or
  the existing `AdminV2AssignmentsService` constructor injection.
- `apps/api-v2/src/admin-v2/ledger/admin-v2-ledger.service.spec.ts` — additive
  diff bounded to: one sibling permissive default mock added on the
  `applies amount-sign and createdAt filters on ledger explorer` test's inline
  `assignmentsService` mock (`getActiveAssigneesForResource: jest.fn(async () => new
Map())`) + one new `it(...)` block. The other five pre-existing tests are
  byte-untouched.
- `apps/admin-v2/src/app/(shell)/ledger/page.tsx` — additive only: one new
  `LedgerEntryAssignedTo` helper (≤14 LOC including JSX, placed between
  `LedgerEntryLinks` and `DisputeLinks`), one new `<div className="muted">` line in
  `LedgerEntriesMobileCards` `queueCardBody`, one new
  `<div className="condensedRowMeta">` block in `LedgerEntriesTabletRows`, one new
  `<th>` and one new `<td>` in `LedgerEntriesDesktopTable`, and one `colSpan` bump
  (`6` → `7`) on the empty-state row. No edits to `formatDate`, `renderMetadata`,
  `LedgerEntryLinks`, `DisputeLinks`, `DisputeMetadataViewer`, the disputes-side render
  components (`DisputesMobileCards`, `DisputesTabletRows`, `DisputesDesktopTable`), the
  `pageHeader`, the filter `<form>`, the `Apply` / `Reset` buttons, the `view` toggle,
  the `nextHref(...)` helper, or the empty-state copy.
- `apps/api-v2/src/admin-v2/assignments/admin-v2-assignments.service.ts` — **zero
  diff** (consumed unmodified).
- `apps/api-v2/src/admin-v2/ledger/admin-v2-ledger.controller.ts`,
  `apps/api-v2/src/admin-v2/ledger/admin-v2-ledger.module.ts` — zero diff.
- `apps/api-v2/src/admin-v2/ledger/anomalies/` — zero diff (separate slice).
- `packages/database-2/prisma/` — zero diff (`no new prisma migrations`).
- `apps/api/`, `apps/admin/`, `apps/api-v2/src/consumer/` — zero diff.

Visual / behavioural:

- The `/ledger?view=entries` page renders the new "Assigned to" cell at all three
  viewports:
  - **Mobile cards** (`[data-view="mobile"]`): a new last `Assigned to: …` muted line
    inside each `queueCardBody`, after `Created:`. Cards with no active assignment
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

- Row click-through (`/ledger/[ledgerEntryId]`), the `Persisted: …` muted line, the
  `Disputes:` / `Created:` muted lines, the rail / amount cells, the empty-state
  branches, the `view=disputes` toggle, and the disputes-side render components are all
  unchanged. The `/ledger?view=disputes` page renders identically to its prior shipped
  state (the disputes-side render components do not touch `assignedTo`; `'dispute'` is
  not an allowlisted `AssignableResourceType`).
- The existing `getLedgerEntryCase` case-page assignment surface on
  `/ledger/[ledgerEntryId]` (3.6a) is observably zero-diff: the case-page assignment
  card continues to render exactly as 3.6a shipped it.
- `/ledger/anomalies` is observably zero-diff: this slice does not touch
  `AdminV2LedgerAnomaliesService` or its module. The anomalies-side surface remains
  without an assignee column (separate slice).

## Decisions

- `Decision: dual-branch Shape A merge inside listLedgerEntries` — `listLedgerEntries`
  is the only method on `AdminV2LedgerService` with **two distinct return branches**
  (the status-filtered raw-SQL `pageIdRows` branch and the default `findMany` branch).
  Three shapes were considered for adding the assignee field: (A) **dual-branch Shape
  A** — apply Shape A post-map merge inside both return branches independently, with
  inline `await` + post-map merge per branch; (B) extract a private
  `decorateWithAssignees(items)` helper used by both branches to deduplicate the merge
  logic; (C) hoist the merge after the branching by collapsing the two branches into a
  single shared post-branch tail. Shape A (option A) was chosen — the two branches
  return structurally different shapes (raw-SQL `pageIdRows` produces a strictly
  ordered `pageIds` array that `findMany({ id: { in: pageIds } })` then re-orders via
  `positionById`; the default branch slices `take: limit + 1` rows directly from
  `findMany`) and merging them post-branch would require a third intermediate variable
  shape that increases the diff-radius; extracting `decorateWithAssignees` would
  introduce a private helper whose only callers are the two branches in this method
  (`no decorateWithAssignees private helper extracted`), and the slice's hard rule is
  `no new helper extraction` even when the helper would be private. Option A keeps the
  per-branch diff isolated to one new `await` + one new `items.map(...)` + the `return`
  swap, which is the smallest reviewable boundary that preserves both branches'
  existing structure byte-stably and mirrors 3.7e's "keep the existing items mapping
  body byte-stable" posture.

- `Decision: desktop column inserted between Status and Amount` — the desktop table
  currently has 6 columns: `Ledger entry | Links | Status | Amount | Disputes |
Created`. Three precedents exist for inserting an `Assigned to` column on a
  single-table page or section: `/exchange/scheduled` (3.7a) inserts between Status and
  Timing; `/documents` (3.7b) inserts between Status and Owner; `/payments` (3.7e)
  inserts between Status and Amount. All three follow "Status → Assigned to → next
  domain cell". This slice inserts `Assigned to` between `Status` and `Amount`,
  producing the new 7-column order
  `Ledger entry | Links | Status | Assigned to | Amount | Disputes | Created`, and
  bumps the empty-state `colSpan` 6 → 7. Appending at the end (after `Created`),
  inserting before `Status`, splitting into a sub-header group, and inserting between
  `Amount` and `Disputes` (which would break the 3.7a/3.7b/3.7e precedent) were all
  rejected.

- `Decision: spec-test boundary per-test sibling default mock without buildService factory`
  — `apps/api-v2/src/admin-v2/ledger/admin-v2-ledger.service.spec.ts` lacks a
  `buildService()` factory; every test constructs `AdminV2LedgerService` inline with
  per-test prisma + assignmentsService mock objects. After this slice, both return
  branches of `listLedgerEntries` call
  `this.assignmentsService.getActiveAssigneesForResource(...)` unconditionally, so a
  strict reading of "do nothing" would break the existing `applies amount-sign …`
  test. Rather than refactor the spec to introduce a `buildService()` factory (a
  separate hygiene concern, out of scope for this slice), the minimum fix is to add a
  sibling permissive default `getActiveAssigneesForResource: jest.fn(async () => new
Map())` to that test's inline `assignmentsService` mock. Tests that do NOT reach
  `listLedgerEntries` are untouched (the case-page assignment-history tests use
  `assignmentsService.getAssignmentContextForResource` via the case method, not the
  bulk helper used by the list method). One new `it(...)` block locks the new field's
  contract end-to-end for the **default `findMany` branch** specifically (no
  `$queryRaw` mock fixture is added; the status-filtered branch is verified by
  inspection of the byte-stable mirror code structure between the two branches in
  `admin-v2-ledger.service.ts`). This mirrors the 3.7e/3.7c precedent on the
  payments-service spec file (3.7e/3.7c each faced the same "no factory" structure
  when adding the bulk call to their respective methods).

- `Decision: same-file LedgerEntryAssignedTo helper, cross-page extraction deferred`
  — this slice introduces three render-site placements of the assignee cell on a
  single page. The page already has three same-file presentational helpers
  (`LedgerEntryLinks`, `DisputeLinks`, `DisputeMetadataViewer`) that exist precisely
  because their content needs to render across the three render modes
  byte-equivalently. The `LedgerEntryAssignedTo` helper is added as a same-file local
  helper alongside them, with a `<span>`-wrapped body so it composes cleanly inside
  `<td>`, `<div className="condensedRowMeta">`, and an inline `<div
className="muted">…</div>` mobile line. A cross-page shared `<AssigneeCell>` React
  component was deliberately not extracted: cross-page extraction follows the same
  trigger discipline as backend helper extraction (3.7b extracted the bulk SQL helper
  at the third consumer); cross-page React-component extraction would need to span six
  different `<td>`/`<div>`/`<p>`/`<article>` parent containers and would be premature
  without an explicit container-shape abstraction. The same-file helper is bounded
  (≤14 LOC) and does not create a cross-page dependency. The trigger for cross-page
  extraction fires at the **third** independent responsive-triple-render consumer
  (`PaymentAssignedTo` from 3.7e + `LedgerEntryAssignedTo` from this slice are the
  only two cross-render-mode helpers today; the third would be `/ledger/anomalies` if
  it lands as triple-render).

- `Decision: freshness-check ledger_entry inline; do not file new open follow-up`
  — this slice is the `seventh bulk consumer of getActiveAssigneesForResource`, and
  the audit `docs/admin-v2-mvp-3.7d-pre-perf-operational-assignment-active-lookup-index-audit.md`
  recorded a forward trigger of "production re-baseline due before sixth bulk consumer
  or one order-of-magnitude row-count growth". That trigger **already fired and was
  mitigated by 3.7e** (the local-dev freshness check at sixth consumer plus the
  production-scale re-baseline filed as an open follow-up in
  `admin-v2-handoff/README.md`); the trigger does not re-fire at the seventh consumer
  (`audit forward trigger does not re-fire at seventh bulk consumer`) and a strict
  reading would not require any perf evidence on this slice. However, `'ledger_entry'`
  was **not** in the original audit's matrix (the audit covered the four
  `resource_type`s `payment_request` / `document` / `fx_conversion` / `verification`),
  so this slice also has a separate first-evidence obligation for the
  `'ledger_entry'` row of the matrix. The bounded mitigation actually taken: (i)
  `freshness check at local dev seed scale for ledger_entry length ∈ {1, 10, 100}` —
  re-ran the audit's EXPLAIN matrix scoped to only the `'ledger_entry' × length ∈ {1,
10, 100}` row of the matrix, against the local dev DB inside a `BEGIN; … ROLLBACK;`
  block (post-rollback baseline confirmed). The captured plans appear verbatim in
  `## Discovered while exploring` below
  (`ledger_entry was not in original audit matrix; first local-dev evidence`). (ii)
  No new open follow-up was filed
  (`production-scale re-baseline already covered by 3.7e open follow-up; no new follow-up filed`)
  — 3.7e's existing `Open follow-up` in `admin-v2-handoff/README.md` for the
  production-scale re-baseline already covers the operator-owned scope generally;
  filing a second follow-up for the same operator-owned action would create duplicate
  signal. Skipping the freshness check, expanding it to other resource types or
  cardinalities, proposing a new index based on it, requesting production DB access
  from inside an autonomous implementation pass, and committing the seed script were
  all rejected.

## Discovered while exploring

`listLedgerEntries` returns a single flat `items` array per branch. Branch B (default
`findMany`) sources the items from a single `findMany` ordered by `(createdAt desc, id
desc)` with `take: limit + 1` and cut to `limit`; ids are unique by construction.
Branch A (status-filtered raw-SQL) sources `pageIds` from a single `$queryRaw` then
re-fetches via `findMany({ where: { id: { in: pageIds } } })` and re-sorts by
`positionById`; ids in `pageIds` are unique by construction (the raw-SQL `LIMIT`
ensures this), so the re-fetched `rows` are also unique by construction. The helper
input is therefore exactly `items.map((item) => item.id)` in both branches and **no
`Set<string>` deduplication is required** for the bulk lookup input in either branch.
This matches 3.7e's `/payments` posture (single flat `items`, no dedup) and contrasts
with 3.7c's `getPaymentRequestQueueWithAssignmentBuckets` (5 server-side `findMany`
queries per request, where the same `payment_request.id` can appear across multiple
buckets and therefore needs a `Set` to dedupe before the helper call). All three
methods reach the same bulk-helper invariant ("the helper input is exactly the set of
ids actually emitted in the response"), but the data shape they start from differs.

The responsive-triple-render character of `/ledger?view=entries` (the same item
rendered three times via three sibling React components in the same file, each picked
by CSS `[data-view="mobile"|"tablet"|"desktop"]`) is the second instance of this
pattern in the assignee-column family: 3.7e on `/payments` was the first responsive-
triple-render consumer; this slice is the second
(`second responsive-triple-render consumer`). The triple rendering is purely a
JSX-level concern: the backend response shape carries `assignedTo` per item exactly
once, the React tree reads it directly off the same item object in all three render
sites, and the three render sites differ only in their parent container DOM shape. No
shared sub-component is required to keep the three renders in sync (Decision 4).

There is **no `page.test.tsx`** for `apps/admin-v2/src/app/(shell)/ledger/page.tsx`,
so this slice does not require a frontend fixture-fix on the page-test side; the
additive `assignedTo` field on the BFF type flows into the page's
`type LedgerEntryItem = LedgerEntriesListResponse['items'][number]` shape
automatically, and the new render-site placements compile against that widened type.

### Freshness check: ledger_entry × length ∈ {1, 10, 100}

`freshness check at local dev seed scale for ledger_entry length ∈ {1, 10, 100}`,
captured non-destructively inside a `BEGIN; … ROLLBACK;` block on the local-dev
PostgreSQL 18.3 instance (`postgresql://wirebill:wirebill@127.0.0.1:5433/remoola`,
docker container `remoola_postgres`). The seed mirrors the `3.7d-pre` audit's posture
and the `3.7e` re-run posture: 4 resource types × 1000 active rows seeded per type
(4000 active rows), plus ~50% of those further duplicated as historical released rows
(2000 additional `released_at IS NOT NULL` rows), `ANALYZE operational_assignment`
between seed and EXPLAIN, transient admin FK reuse (existing admin UUID
`6f5eb51a-0e20-48e2-9488-1f85e44bef26`). Pre-seed baseline: `total = 0`, `active = 0`.
Post-rollback baseline: `total = 0`, `active = 0` (transactional integrity confirmed;
no commit, no persisted artifact, no seed file committed).
`ledger_entry was not in original audit matrix; first local-dev evidence`: the audit
`docs/admin-v2-mvp-3.7d-pre-perf-operational-assignment-active-lookup-index-audit.md`
covered `'payment_request'`, `'document'`, `'fx_conversion'`, `'verification'`;
`'ledger_entry'` was **not** in that matrix (per the audit's `LANDED.md` summary "all
four `resource_type`s `payment_request` / `document` / `fx_conversion` /
`verification`"), so this slice provides the **first** local-dev evidence for the
`'ledger_entry'` row of the matrix.

PostgreSQL version: `PostgreSQL 18.3 (Debian 18.3-1.pgdg13+1) on x86_64-pc-linux-gnu,
compiled by gcc (Debian 14.2.0-19) 14.2.0, 64-bit`.

Seed totals after `INSERT … FROM unnest × generate_series(...)` and
historical-duplication INSERT: `total_seeded = 6000`, `active_seeded = 4000`,
`active_le_seeded = 1000` (1000 active `'ledger_entry'` rows out of 4000 active across
all four resource types).

Plan LE-1 — `ledger_entry × length = 1`:

```text
                                                                         QUERY PLAN
-------------------------------------------------------------------------------------------------------------------------------------------------------------
 Nested Loop Left Join  (cost=43.17..51.88 rows=2 width=96) (actual time=0.235..0.236 rows=1.00 loops=1)
   Join Filter: (ad.id = a.assigned_to)
   Rows Removed by Join Filter: 2
   Buffers: shared hit=117
   InitPlan 1
     ->  Limit  (cost=0.00..0.27 rows=1 width=16) (actual time=0.215..0.215 rows=1.00 loops=1)
           Buffers: shared hit=113
           ->  Seq Scan on operational_assignment  (cost=0.00..268.00 rows=997 width=16) (actual time=0.214..0.214 rows=1.00 loops=1)
                 Filter: ((released_at IS NULL) AND (resource_type = 'ledger_entry'::text))
                 Rows Removed by Filter: 1000
                 Buffers: shared hit=113
   ->  Bitmap Heap Scan on operational_assignment a  (cost=42.90..50.34 rows=2 width=32) (actual time=0.228..0.228 rows=1.00 loops=1)
         Recheck Cond: ((resource_type = 'ledger_entry'::text) AND (resource_id = ANY ((InitPlan 1).col1)) AND (released_at IS NULL))
         Heap Blocks: exact=1
         Buffers: shared hit=116
         ->  Bitmap Index Scan on idx_operational_assignment_active_resource  (cost=0.00..42.90 rows=2 width=0) (actual time=0.225..0.225 rows=1.00 loops=1)
               Index Cond: ((resource_type = 'ledger_entry'::text) AND (resource_id = ANY ((InitPlan 1).col1)))
               Index Searches: 1
               Buffers: shared hit=115
   ->  Materialize  (cost=0.00..1.09 rows=6 width=48) (actual time=0.004..0.005 rows=3.00 loops=1)
         Storage: Memory  Maximum Storage: 17kB
         Buffers: shared hit=1
         ->  Seq Scan on admin ad  (cost=0.00..1.06 rows=6 width=48) (actual time=0.002..0.002 rows=3.00 loops=1)
               Buffers: shared hit=1
 Planning:
   Buffers: shared hit=31
 Planning Time: 0.200 ms
 Execution Time: 0.251 ms
(28 rows)
```

Plan LE-10 — `ledger_entry × length = 10`:

```text
                                                                          QUERY PLAN
--------------------------------------------------------------------------------------------------------------------------------------------------------------
 Nested Loop Left Join  (cost=45.59..54.30 rows=2 width=96) (actual time=0.237..0.243 rows=10.00 loops=1)
   Join Filter: (ad.id = a.assigned_to)
   Rows Removed by Join Filter: 20
   Buffers: shared hit=131
   InitPlan 1
     ->  Limit  (cost=0.00..2.69 rows=10 width=16) (actual time=0.199..0.201 rows=10.00 loops=1)
           Buffers: shared hit=113
           ->  Seq Scan on operational_assignment  (cost=0.00..268.00 rows=997 width=16) (actual time=0.199..0.200 rows=10.00 loops=1)
                 Filter: ((released_at IS NULL) AND (resource_type = 'ledger_entry'::text))
                 Rows Removed by Filter: 1000
                 Buffers: shared hit=113
   ->  Bitmap Heap Scan on operational_assignment a  (cost=42.90..50.34 rows=2 width=32) (actual time=0.231..0.232 rows=10.00 loops=1)
         Recheck Cond: ((resource_type = 'ledger_entry'::text) AND (resource_id = ANY ((InitPlan 1).col1)) AND (released_at IS NULL))
         Heap Blocks: exact=1
         Buffers: shared hit=130
         ->  Bitmap Index Scan on idx_operational_assignment_active_resource  (cost=0.00..42.90 rows=2 width=0) (actual time=0.229..0.229 rows=10.00 loops=1)
               Index Cond: ((resource_type = 'ledger_entry'::text) AND (resource_id = ANY ((InitPlan 1).col1)))
               Index Searches: 8
               Buffers: shared hit=129
   ->  Materialize  (cost=0.00..1.09 rows=6 width=48) (actual time=0.000..0.000 rows=3.00 loops=10)
         Storage: Memory  Maximum Storage: 17kB
         Buffers: shared hit=1
         ->  Seq Scan on admin ad  (cost=0.00..1.06 rows=6 width=48) (actual time=0.002..0.002 rows=3.00 loops=1)
               Buffers: shared hit=1
 Planning Time: 0.114 ms
 Execution Time: 0.257 ms
(26 rows)
```

Plan LE-100 — `ledger_entry × length = 100`:

```text
                                                                          QUERY PLAN
---------------------------------------------------------------------------------------------------------------------------------------------------------------
 Nested Loop Left Join  (cost=69.78..78.50 rows=2 width=96) (actual time=0.593..0.684 rows=100.00 loops=1)
   Join Filter: (ad.id = a.assigned_to)
   Rows Removed by Join Filter: 200
   Buffers: shared hit=142
   InitPlan 1
     ->  Limit  (cost=0.00..26.88 rows=100 width=16) (actual time=0.314..0.343 rows=100.00 loops=1)
           Buffers: shared hit=115
           ->  Seq Scan on operational_assignment  (cost=0.00..268.00 rows=997 width=16) (actual time=0.313..0.335 rows=100.00 loops=1)
                 Filter: ((released_at IS NULL) AND (resource_type = 'ledger_entry'::text))
                 Rows Removed by Filter: 1000
                 Buffers: shared hit=115
   ->  Bitmap Heap Scan on operational_assignment a  (cost=42.90..50.34 rows=2 width=32) (actual time=0.584..0.595 rows=100.00 loops=1)
         Recheck Cond: ((resource_type = 'ledger_entry'::text) AND (resource_id = ANY ((InitPlan 1).col1)) AND (released_at IS NULL))
         Heap Blocks: exact=3
         Buffers: shared hit=141
         ->  Bitmap Index Scan on idx_operational_assignment_active_resource  (cost=0.00..42.90 rows=2 width=0) (actual time=0.578..0.578 rows=100.00 loops=1)
               Index Cond: ((resource_type = 'ledger_entry'::text) AND (resource_id = ANY ((InitPlan 1).col1)))
               Index Searches: 8
               Buffers: shared hit=138
   ->  Materialize  (cost=0.00..1.09 rows=6 width=48) (actual time=0.000..0.000 rows=3.00 loops=100)
         Storage: Memory  Maximum Storage: 17kB
         Buffers: shared hit=1
         ->  Seq Scan on admin ad  (cost=0.00..1.06 rows=6 width=48) (actual time=0.003..0.004 rows=3.00 loops=1)
               Buffers: shared hit=1
 Planning Time: 0.154 ms
 Execution Time: 0.708 ms
(26 rows)
```

Pass condition met across all three buckets: planner picks the
`idx_operational_assignment_active_resource partial unique candidate` for the
production query body's active-row predicate at every cardinality (`Bitmap Index Scan
on idx_operational_assignment_active_resource` on the `operational_assignment a` table
alias that is the actual subject query); no `Seq Scan on operational_assignment` is
chosen for the production query body at any bucket; no
`operational_assignment_resource_type_resource_id_released_at_idx full composite
candidate` is preferred over the partial; `Buffers: shared hit` grows sub-linearly
with `length` (117 → 131 → 142); `Execution Time` stays sub-millisecond (0.251 ms /
0.257 ms / 0.708 ms). The `Seq Scan on operational_assignment` that appears inside
`InitPlan 1` is the test-scaffold subquery used to materialise the `ANY(...)` array
for the EXPLAIN shape (it is **not** part of the production query path that
`getActiveAssigneesForResource` issues; the production query receives a pre-known
`uuid[]` parameter from the caller). This matches the audit's prior result for the
four originally-covered resource types and confirms no planner regression on
`'ledger_entry'` at local-dev row count. The freshness check is **not** a substitute
for the production-scale re-baseline (already covered by 3.7e's open follow-up;
`production-scale re-baseline already covered by 3.7e open follow-up; no new follow-up
filed`).

## Follow-ups

- Production-scale re-baseline of `operational_assignment(resource_type, resource_id,
released_at)` index audit — **already filed as an `Open follow-up`** in
  `admin-v2-handoff/README.md` by `MVP-3.7e`. Operator-owned (requires production DB
  access, which is not part of the autonomous-handoff implementation pass). Suggested
  execution path: re-run the audit's EXPLAIN matrix at production row counts including
  `'ledger_entry'`; ship as a follow-on `SLICE-PATCH` mirroring
  `SLICE-PATCH-operational-assignment-active-lookup-index-audit.md` if any planner
  regression is found. **This slice does not duplicate that follow-up.**
- `/ledger/anomalies` remains a separate responsive-triple-render slice.
  `AdminV2LedgerAnomaliesService` does not currently inject
  `AdminV2AssignmentsService`; the next anomalies-side slice must add module +
  constructor wiring before extending the anomalies list response. The anomalies items
  reference `ledgerEntryId` in their payload, so the natural assignee semantics map to
  the underlying `'ledger_entry'` resourceType (already allowlisted by 3.6a).
- Disputes-side surfacing is **not** a future slice — `'dispute'` is not an
  allowlisted `AssignableResourceType` and is not a planned activation in current
  `admin-v2-pack/*` evidence; treat dispute ownership as a separate architectural
  question if it ever comes up.
- `consumer` resourceType activation remains pending architectural design for
  cross-context ownership composition (last referenced in
  `admin-v2-handoff/README.md` and reaffirmed across 3.7d/3.7e); not absorbed by this
  slice (`consumer resourceType activation out of scope pending architectural design`).
- Cross-page `<AssigneeCell>` React-component extraction is deferred until container-
  shape abstraction is itself justified by a third independent multi-render consumer.
  Currently `PaymentAssignedTo` (3.7e) and `LedgerEntryAssignedTo` (this slice) are
  the only cross-render-mode helpers; verification / exchange / documents /
  payments-operations / payouts continue to inline the same JSX. Trigger fires at the
  **third** responsive-triple-render consumer, which would be `/ledger/anomalies` if
  it lands as triple-render.
- `Closed follow-up: ledger list assignment column` — the
  `MVP-3.6a` / `MVP-3.7a` / `MVP-3.7b` / `MVP-3.7c` / `MVP-3.7d` / `MVP-3.7e`
  `ledger list assignment column out of scope` deferral chain closes with this slice.
