# Slice MVP-3.6d — Operational assignments activation for `document` resourceType

## Slice scope

This slice (MVP-3.6d) is a strictly additive **operational assignments document activation**
that consumes the shared infrastructure already extracted by MVP-3.6b (the public
`AdminV2AssignmentsService.getAssignmentContextForResource` helper and the shared
`<AssignmentCard>` server component). It is the fifth operational-assignments
multi-resource activation slice (after 3.2a `verification`, 3.6a `ledger_entry`,
3.6b `payment_request`, and 3.6c `payout`).

- `ASSIGNABLE_RESOURCE_TYPES extension`: `ASSIGNABLE_RESOURCE_TYPES` in
  `apps/api-v2/src/admin-v2/assignments/admin-v2-assignments.dto.ts` widened from
  `['verification', 'ledger_entry', 'payment_request', 'payout']` to
  `['verification', 'ledger_entry', 'payment_request', 'payout', 'document']`. With this
  single TypeScript-constant change, `'document' resourceType activated` end-to-end on the
  existing assignments surface.
- `reuse shared backend helper getAssignmentContextForResource`: `AdminV2DocumentsService`
  becomes the fifth consumer of the public read-only
  `AdminV2AssignmentsService.getAssignmentContextForResource(resourceType, resourceId)`
  helper that 3.6b extracted. No new helper is added; no helper is forked or copied.
- `AdminV2DocumentsService` is extended along the same shape as the 3.6c payouts service:
  it now injects `AdminV2AssignmentsService`, and `getDocumentCase` returns
  `assignment: { current, history }` populated by the shared helper, fetched concurrently
  with the existing `resourceModel.findFirst` lookup via a single `Promise.all`.
- Extended the BFF type `DocumentCaseResponse` in
  `apps/admin-v2/src/lib/admin-api.server.ts` with the same `assignment` shape,
  forward-referencing the existing exported `AssignmentSummary` and
  `AssignmentHistoryItem` types. Placement appends the field at the end of the response
  shape (after `dataFreshnessClass`) — consistent with the "additive trailing field"
  pattern used by the other case responses for new optional context blocks.
- Added three exported server actions and one private revalidate helper in
  `apps/admin-v2/src/lib/admin-mutations.server.ts`:
  `claimDocumentAssignmentAction`, `releaseDocumentAssignmentAction`,
  `reassignDocumentAssignmentAction`, plus `revalidateDocumentAssignmentPaths`. They
  proxy through `postAdminMutation` to the existing endpoints with
  `resourceType: 'document'`. The new block sits directly after the `payout` block and
  before `resetAdminPasswordAction`. All three exported actions return `Promise<void>`
  to remain compatible with React typed `<form action>` consumption inside the shared
  `<AssignmentCard>` server component.
- `Decision: narrow revalidate helper (documents list + case only)` —
  `revalidateDocumentAssignmentPaths(documentId)` revalidates exactly `/documents` and
  `/documents/${documentId}`. It deliberately does **not** invoke the existing
  `revalidateDocumentsPaths` helper because that helper additionally revalidates
  `/documents/tags`, which is out of scope for assignment mutations.
- `reuse shared frontend AssignmentCard component`: the document case page consumes the
  shared `<AssignmentCard>` (extracted by 3.6b) without component changes. No new card
  component is introduced and no inline card JSX is copied.
- `assignment context on /documents/[documentId] case page`: the documents case page now
  derives capability flags directly from `getAdminIdentity()` (`assignments.manage` for
  claim/release, `SUPER_ADMIN` role for reassign) and renders the shared
  `<AssignmentCard>` between the existing "Visible tags / Boundary notes"
  `<section className="detailGrid">` and the conditional `canManage` retag form section.
  `getAdmins({ page: 1, pageSize: 50, status: 'ACTIVE' })` is fetched only when
  `canReassign === true` so the unprivileged case incurs no extra round-trip.
- `Decision: AdminV2DocumentsModule.exports unchanged` — only `imports` was widened with
  `AdminV2AssignmentsModule`; the module was previously not exporting
  `AdminV2DocumentsService` and that frozen module surface is preserved.
- Hard rules upheld: `no new prisma migrations`, `no new capability`,
  `no new audit action`, `no new endpoint`. The slice is `reuse assignments.manage` for
  capability, `reuse assignment_claim` / `reuse assignment_release` /
  `reuse assignment_reassign` for audit vocabulary (per-row metadata simply carries
  `resource: 'document'`), and `reuse POST /admin-v2/assignments/{claim,release,reassign}`
  for endpoint surface.
- `documents list page unchanged` — the new card lives only on the document case page,
  mirroring the 3.6a (`anomalies-list` / `ledger-list`), 3.6b (`payments-list` /
  `payments-operations`), and 3.6c (`payouts-list`) deferrals. `(shell)/documents/page.tsx`
  and `AdminV2DocumentsService.listDocuments` are untouched.
- `documents tags page unchanged` — `(shell)/documents/tags/page.tsx` and the document-tag
  CRUD surface (`createDocumentTagAction`, `updateDocumentTagAction`,
  `deleteDocumentTagAction`) are not touched. Tags are an evidence-classification
  primitive, not an assignment target.
- `verification surface frozen`, `ledger surface frozen`, `payments surface frozen`,
  `payouts surface frozen` — all four previously-activated case-page consumers and their
  backend services are untouched by this slice.
- `retagDocumentAction frozen`, `bulkTagDocumentsAction frozen` — the existing document
  tag-mutation surface (`AdminV2DocumentsService.retagDocument`,
  `AdminV2DocumentsService.bulkTagDocuments`, the `/admin-v2/documents/:id/retag` and
  `/admin-v2/documents/bulk-tag` controller endpoints, the page-level retag form
  rendered behind `canManage`) all remain byte-equivalent. The `assignment` field and
  the new `<AssignmentCard>` coexist with the retag form — assignment ownership and tag
  classification are orthogonal.
- `apps/api/ workspace frozen`, `apps/admin/ workspace frozen`, and
  `apps/api-v2/src/consumer/ frozen` for this slice.

## Files touched

- `apps/api-v2/src/admin-v2/assignments/admin-v2-assignments.dto.ts` — added `'document'`
  literal to the `ASSIGNABLE_RESOURCE_TYPES` tuple. One-line additive change to the
  exported tuple (now reformatted across multiple lines because the tuple grew past the
  prettier print-width).
- `apps/api-v2/src/admin-v2/assignments/admin-v2-assignments.service.spec.ts` — rotated
  the negative `claim` test literal from `'fx_conversion'` to `'consumer'` (still in the
  DB CHECK list but no longer required to be the still-unallowlisted sentinel after
  this slice activates `'document'`); added positive `'document'` claim, release, and
  reassign tests mirroring the existing `payout` / `payment_request` / `ledger_entry`
  patterns; added a positive `getAssignmentContextForResource('document', ...)` shape
  test. +4 tests net.
- `apps/api-v2/src/admin-v2/documents/admin-v2-documents.service.ts` — additive
  `AdminV2AssignmentsService` import; constructor extended with
  `private readonly assignmentsService: AdminV2AssignmentsService` (fourth positional
  parameter, after `prisma`, `storage`, `idempotency`). `getDocumentCase` now fetches
  the existing `resourceModel.findFirst` and the assignment context concurrently via
  `Promise.all` and returns the new `assignment` field on the response shape.
  `listDocuments`, `listTags`, `createTag`, `updateTag`, `deleteTag`, `retagDocument`,
  `bulkTagDocuments`, and `openDownload` are unchanged.
- `apps/api-v2/src/admin-v2/documents/admin-v2-documents.module.ts` — additive
  `AdminV2AssignmentsModule` import in the NestJS `imports` array. The module's
  `controllers` and `providers` arrays are unchanged. The module continues to expose no
  `exports` (per `Decision: AdminV2DocumentsModule.exports unchanged`).
- `apps/api-v2/src/admin-v2/documents/admin-v2-documents.service.spec.ts` — added a
  shared `createAssignmentsService()` mock factory (default
  `getAssignmentContextForResource → { current: null, history: [] }`); fanned out the
  fourth constructor argument across all 11 inline `new AdminV2DocumentsService(...)`
  instantiations; existing two `getDocumentCase` shape tests now assert the
  `assignment: { current: null, history: [] }` field; new test asserts the helper is
  invoked with `('document', documentId)` and that the returned `current`/`history`
  populate `documentCase.assignment` when the helper resolves to a non-null context.
  +1 test net. (No abstract `buildService()` factory was extracted because the file
  already follows an inline-construction pattern.)
- `apps/admin-v2/src/lib/admin-api.server.ts` — extended `DocumentCaseResponse` with
  `assignment: { current: AssignmentSummary | null; history: AssignmentHistoryItem[] }`,
  appended at the end of the response shape (after `dataFreshnessClass`).
- `apps/admin-v2/src/lib/admin-mutations.server.ts` — appended the three new server
  actions (`claimDocumentAssignmentAction`, `releaseDocumentAssignmentAction`,
  `reassignDocumentAssignmentAction`) and the private
  `revalidateDocumentAssignmentPaths(documentId)` helper (revalidates `/documents` and
  `/documents/${documentId}` only) directly after `reassignPayoutAssignmentAction` and
  before `resetAdminPasswordAction`. All three exported actions are typed as
  `Promise<void>` so React's typed `<form action>` accepts them as bound actions inside
  the shared `<AssignmentCard>`. No new imports.
- `apps/admin-v2/src/app/(shell)/documents/[documentId]/page.tsx` — additive imports
  (`getAdmins`, `AssignmentCard`, the three new document assignment server actions);
  new identity-aware capability derivation block (`canClaim` / `canRelease` /
  `canReassign`) modeled on the canonical payouts case page; conditional
  `getAdmins({ page: 1, pageSize: 50, status: 'ACTIVE' })` fetch only when
  `canReassign === true`; `<AssignmentCard ... />` invocation between the
  "Visible tags / Boundary notes" `<section className="detailGrid">` and the
  `canManage` retag form section, with
  `copy={{ claimReasonPlaceholder: 'Why are you claiming this document?' }}`. The
  existing case-header, owner-link, payment-linkage, retag form (behind `canManage`),
  secure download link, and tag pills are all unchanged.
- `apps/admin-v2/src/app/(shell)/documents/[documentId]/page.test.tsx` — added
  `getAdmins` and the three document-assignment server actions to the mocked module
  surface; added `assignments.manage` to the default identity capability set; included
  the default `assignment: { current: null, history: [] }` field on the mock case
  payload; added a `getAdmins` resolver default returning an empty
  `AdminsListResponse`-shaped page. No new tests required because the existing
  "renders case links and exact retag controls without extra workflow surfaces" test
  already exercises the page through full SSR markup, which now includes the
  AssignmentCard render path.
- `scripts/admin-v2-gates/config.mjs` — additive: `CHECK_PATHS` now references this
  reconciliation note, `FRONTEND_ACTIONS` lists the three new document assignment server
  actions (positioned directly after the `payout` triplet), and `RECONCILIATION_NOTES`
  carries the new top-level block enumerating the slice tokens. No changes to
  `AUDIT_ACTIONS`, `CAPABILITIES`, or `ROUTE_TOKENS`.
- `docs/admin-v2-mvp-3.6d-operational-assignments-document-activation.md` — this file.

## Decisions

- `Decision: document fifth resource type`. After 3.6c shipped `payout`, the values still
  enumerated by `operational_assignment_resource_type_check` but not yet activated at
  the application layer were `fx_conversion`, `document`, and `consumer`. Of these,
  `document` is the only one with a fully landed admin-v2 case page
  (`/documents/[documentId]`), a stable `getDocumentCase` BFF surface, and a single
  natural ownership unit (one `Resource` row per document). `fx_conversion` lacks a
  case page entirely in admin-v2; `consumer` is a separate ownership story (consumer-
  level investigation lifetimes differ materially from per-resource ownership).
  Activating `document` exercises the full end-to-end surface (BFF type, server
  actions, page integration) while keeping the diff aligned with one resource only and
  reusing the shared infrastructure landed by 3.6b.
- `Decision: zero migration (DB CHECK already permits document)`. The
  `operational_assignment_resource_type_check` constraint defined in
  `packages/database-2/prisma/migrations/20260417223000_operational_assignment_foundation/migration.sql`
  already enumerates `'document'` in the resource_type allowlist (verified at
  `migration.sql:24`). The unique partial index
  `idx_operational_assignment_active_resource` already enforces single-active per
  `(resource_type, resource_id)` for any value of `resource_type`. No migration is
  needed; an empty one would duplicate the existing CHECK.
- `Decision: consume shared helper (no extraction)`. The 3.6b reconciliation note
  closed the helper-extraction follow-up by introducing
  `AdminV2AssignmentsService.getAssignmentContextForResource`. This slice consumes that
  helper as its fifth caller (after verification, ledger, payments, payouts). No new
  helper is introduced; the existing helper signature is sufficient for the new
  resource type because it is already typed against `AssignableResourceType` and that
  union widens automatically when the dto allowlist gains `'document'`.
- `Decision: consume shared AssignmentCard (no component changes)`. The shared
  `<AssignmentCard>` server component already accepts a typed
  `actions: { claim, release, reassign }` triple plus `capabilities`, `assignment`,
  `reassignCandidates`, and an optional `copy` block. The new document consumer
  supplies document-specific actions and `claimReasonPlaceholder` text without
  touching the component file. Frozen-scope verification before this slice's frontend
  commits confirmed zero diff in `apps/admin-v2/src/components/assignment-card.tsx`.
- `Decision: documents list assignment column out of scope`.
  `AdminV2DocumentsService.listDocuments` has its own SQL composition with cursor /
  pagination / filter implications, mirroring the 3.6a (`ledgerList` /
  `ledgerAnomaliesList`), 3.6b (`paymentsList`, `payments operations`), and 3.6c
  (`payoutsList`) deferrals. Adding an assignment column there is a separate diff with
  its own perf and pagination story; operators always navigate to the case page from
  the document link anyway.
- `Decision: tags page out of scope`. Tags model evidence classification, not
  ownership. The existing `(shell)/documents/tags/page.tsx`, the
  `createDocumentTagAction` / `updateDocumentTagAction` / `deleteDocumentTagAction`
  server actions, and the `document_tag_*` audit actions are completely orthogonal to
  the assignment surface. Conflating the two would dilute the meaning of both.
- `Decision: reuse assignment_* audit actions across resourceTypes`. Same as 3.6a /
  3.6b / 3.6c. Per-row `resource_type` is already carried as metadata
  (`row.resource_type` flowed through to `audit.resource`) — that is the right place to
  discriminate by resource type, not the action constant. Adding
  `document_assignment_claim` / etc. would double the vocabulary.
- `Decision: SUPER_ADMIN reassign requirement preserved`. The 3.2a §17.6 invariant
  ("`reassign` requires SUPER_ADMIN") remains in force through reuse: the frozen
  `AdminV2AssignmentsService.reassign` body still enforces it, and the new documents
  case page derives `canReassignAssignments = identity?.role === 'SUPER_ADMIN'`,
  matching the verification, ledger, payments, and payouts pages.
- `Decision: regulated decision controls preserved through reuse`. As with 3.6b / 3.6c,
  the documents case page does not introduce a `decisionControls` field on its BFF
  response; the UI derives gating directly from `getAdminIdentity()` capabilities/role.
  The server endpoint remains the source of truth — UI flags only hide controls. This
  avoids widening the BFF contract solely for UI affordance and keeps all five cards
  (verification, ledger, payments, payouts, documents) on the same gating discipline.
- `Decision: narrow revalidate helper (documents list + case only)`. The existing
  `revalidateDocumentsPaths` helper revalidates `/documents`, `/documents/${id}`, **and**
  `/documents/tags` because tag mutations cascade across the tag dictionary. Assignment
  mutations have no such cascade — they only affect ownership state on the case row and
  the (potential future) ownership column on the list. Wiring assignment mutations
  through `revalidateDocumentsPaths` would force unnecessary revalidation of the tags
  page on every claim / release / reassign. Introducing a narrow
  `revalidateDocumentAssignmentPaths` keeps the assignment surface aligned with the
  3.6a / 3.6b / 3.6c pattern (each resource type has its own narrow assignment-paths
  helper) and avoids cross-section revalidation churn.
- `Decision: AdminV2DocumentsModule.exports unchanged`. The pre-existing
  `AdminV2DocumentsModule` does not export `AdminV2DocumentsService`. That frozen
  surface is preserved: only `imports` was widened with `AdminV2AssignmentsModule`. No
  other module imports `AdminV2DocumentsService`, so no `exports` field is required.
- `Decision: F1 migration drift not absorbed`. CLOSED upstream by the SLICE-PATCH
  platform hygiene bundle (verified by `prisma migrate status` clean-check wired into
  pre-commit). This slice does not touch `packages/database-2/prisma/migrations/`.
- `Decision: prisma format whitespace drift not absorbed`. CLOSED upstream by the
  SLICE-PATCH platform hygiene bundle. This slice does not touch
  `packages/database-2/prisma/schema.prisma`.

## Discovered while exploring

- `AdminV2DocumentsService.getDocumentCase` previously made a single
  `resourceModel.findFirst` call. Wrapping it together with the assignment-context
  fetch in `Promise.all` produced the smallest diff (one local refactor at the await
  site, one new field in the return shape) without disturbing the surrounding mappings.
- `apps/api-v2/src/admin-v2/documents/admin-v2-documents.service.spec.ts` follows an
  inline-construction pattern (11 separate `new AdminV2DocumentsService(...)` sites)
  rather than an abstract `buildService()` factory like the payouts spec. Per the
  pre-edit stop-and-ask trigger, the inline pattern is the standard pattern for this
  file and is safe to fan out — no spec refactor is in scope for this slice.
- The existing two `getDocumentCase` shape tests use `toEqual` against the full return
  shape, so they had to grow the expected `assignment: { current: null, history: [] }`
  trailing field as part of the constructor fan-out; otherwise they would have failed
  on shape divergence even without exercising the new code path.
- The pre-existing documents page test was missing `assignments.manage` from the
  default identity capability set. The test still passed against the legacy page
  because the page did not reference assignment surfaces. With the new
  `<AssignmentCard>` rendering unconditionally (gated only by `canClaim` / `canRelease`
  / `canReassign` per-button), adding `assignments.manage` to the default identity
  ensures the new affordance is exercised by the existing test fixture.
- All three new server actions return `Promise<void>` (not `Promise<unknown>` or a
  per-action result type). React's typed `<form action>` rejects bound actions whose
  return type is not assignable to `void | Promise<void>`. Carrying the Bug-3 lesson
  forward from the 3.6b kickoff prevented a regression at the page-render level.

## Tests baseline shift

- Backend `yarn test:admin-v2`:
  - `admin-v2-assignments.service.spec.ts` gains four positive `'document'` tests
    (claim, release, reassign, `getAssignmentContextForResource` shape) and rotates the
    "rejects unknown resourceType" sentinel from `'fx_conversion'` to `'consumer'`
    because `'document'` is now allowlisted (and `'fx_conversion'` remains the next
    planned resource type, so the sentinel migrates to the next-still-blocked literal).
  - `admin-v2-documents.service.spec.ts` gains the new `createAssignmentsService()`
    mock factory, fans out the fourth constructor argument across all 11 inline
    instantiations, asserts the `assignment: { current: null, history: [] }` field on
    both existing `getDocumentCase` shape tests, and gains one dedicated
    assignment-context test that mocks `getAssignmentContextForResource` on the
    injected `assignmentsService`, asserts the helper is invoked with
    `('document', documentId)`, and asserts the `current` / `history` shape is
    forwarded onto `documentCase.assignment`.
- Frontend `yarn workspace @remoola/admin-v2 test`:
  - `apps/admin-v2/src/app/(shell)/documents/[documentId]/page.test.tsx` extends the
    mocked module surface with `getAdmins` and the three document-assignment server
    actions, adds `assignments.manage` to the default identity capability set, and
    extends the mock case payload with the default `assignment: { current: null,
history: [] }` field. The two existing tests continue to pass with the broader
    page render now including the AssignmentCard.
- No new e2e specs are required by the slice; the existing controller e2e coverage on
  `/admin-v2/assignments/*` already exercises the controller path for all
  resource types via the shared endpoints.

## Closed follow-ups

- No follow-ups closed in this slice. The 3.6c known follow-up enumerating
  `fx_conversion` / `document` / `consumer` activations is partially advanced by this
  slice — `document` now lands, while `fx_conversion` and `consumer` remain open.

## Known follow-ups

- `fx_conversion` and `consumer` resourceType activations remain out of scope and are
  tracked as separate future slices. Each activation requires a fully landed case-page
  surface plus the same `ASSIGNABLE_RESOURCE_TYPES` widening pattern used here.
- Auto-expire / SLA escalation / "My assignments" view / overview tile for any
  resource type remains out of scope (3.2a §11) and continues to defer to a future
  workspace slice.
- A standalone admin-v2 page test for the `<AssignmentCard>` claim / release / reassign
  _form submission_ paths (covering the server-action wiring end-to-end at the page
  level) is deferred to a future page-coverage slice. Current page tests exercise
  capability gating and conditional `getAdmins` invocation; submission paths rely on
  the existing controller e2e coverage on `/admin-v2/assignments/*`.
- A documents-list "owner" / "assignment" column (analogous to the still-deferred
  payouts-list, payments-list, and ledger-list assignment columns) remains open for a
  follow-up workspace slice.
