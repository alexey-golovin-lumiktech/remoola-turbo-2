# MVP-3.4b — System Alerts: `verification_queue` workspace section

## Summary

This slice closes the explicit `Closes 3.4a §1.22 deferral` UI gap by rendering a third
operational-alerts management section + create-form on `/system/alerts` for the
`verification_queue` workspace. It is a pure `verification_queue alerts UI` extension
landed under `Sequence 6` of `admin-v2-pack/08-rollout-risks-and-sequencing.md` with
`no backend change`, `no allowlist change`, `no migration`, `no new capability`, and
`no new audit action`.

The backend allowlist `OPERATIONAL_ALERT_WORKSPACES = ['ledger_anomalies',
'verification_queue', 'auth_refresh_reuse']`, the `VerificationQueueAlertEvaluator`
strategy class, the `getQueueCount` service method on `AdminV2VerificationService`, and
the `verification_queue` workspace `CHECK` constraint were all landed in MVP-3.4a; this
slice changes none of them. The slice does not touch saved-views: saved views for
`verification_queue` already shipped on `/verification` in 3.4a, not on `/system/alerts`.

## Implemented

- `OperationalAlertsPage third section`: extended the single `Promise.all([...])` in
  `apps/admin-v2/src/app/(shell)/system/alerts/page.tsx` from two
  `getOperationalAlerts({ workspace })` calls to three (page-level fetch parallelism
  preserved — no sequential awaits introduced) and added a third `<WorkspaceSection
  workspace="verification_queue" ... />` invocation between the existing
  `ledger_anomalies` and `auth_refresh_reuse` sections.
- `parseVerificationQueueQuery`: a new in-file frontend type-coercer that mirrors the
  backend `parseVerificationQueuePayload` accept-list
  (`status`, `stripeIdentityStatus`, `country`, `contractorKind`). It returns `{}` for
  `null`/`undefined` (total-queue baseline), `null` for non-object input, and a typed
  partial object otherwise. Rejected-keys enforcement is intentionally left to the
  backend evaluator — the frontend describer is non-throwing by design.
- `describeQueryPayload verification_queue branch`: returns the literal
  `Filters: (none — total queue)` for an empty payload and the compact
  `Filters: key=value, ...` summary for non-empty payloads. Ledger-anomalies and
  auth-refresh-reuse describer behavior is unchanged byte-for-byte.
- `CreateVerificationQueueAlertForm`: a sibling in-file component that mirrors the
  shape of `CreateAuthRefreshReuseAlertForm`. The default
  `default queryPayload {}` field renders the literal `{}` and the inline
  `frontend-only filters disclaimer mirrored from /verification` enumerates the
  supported keys plus the `missingProfileData` / `missingDocuments` exclusion using
  the exact wording from `apps/admin-v2/src/app/(shell)/verification/page.tsx`
  lines 206–207.
- `WorkspaceSection`: gained a third `workspace === 'verification_queue'` conditional
  that renders the new create-form. The two existing conditionals are unchanged.
- Test coverage: the empty-state test in
  `apps/admin-v2/src/app/(shell)/system/alerts/page.test.tsx` now asserts on all three
  workspace titles, all three create-form headings, all three `value="<workspace>"`
  hidden inputs, and the three `getOperationalAlerts({ workspace })` invocations. A
  new test covers both the filtered-payload summary
  (`Filters: status=pending, country=US`) and the empty-payload total-queue summary
  (`Filters: (none — total queue)`) for `verification_queue`.

### Decisions (mirroring the handoff Unique Decisions section)

- `Decision: sibling create-form, not parametric refactor` — Adding
  `CreateVerificationQueueAlertForm` as a sibling component in the same file (rather
  than extracting a generic parametric `<CreateAlertForm workspace={...} />` or a
  `WORKSPACE_CREATE_FORM_REGISTRY`) keeps workspace-shaped help text local, the diff
  additive, and the next workspace-add cheap. The alerts surface is one of the few
  areas where workspace-specific copy is the spec, not an accident.
- `Decision: default queryPayload is empty (total queue baseline)` — The form's
  default `queryPayload` is `{}`, matching the evaluator's own posture (`{}` is the
  total-queue baseline). Pre-populating any filter (e.g. `{ status: 'pending' }`)
  would imply an editorial choice that no source of truth makes; operators should
  pick filters explicitly.
- `Decision: no fired-state indicator on /verification` — In-app FIRED badges live
  on `/system/alerts` only (and they fall out of `WorkspaceSection` reuse for free
  for the new section). 3.4a §1.22 explicitly defers the fired-state surfacing on
  `/verification`; this slice respects that deferral and does not edit
  `apps/admin-v2/src/app/(shell)/verification/page.tsx`.

### Files touched

- `apps/admin-v2/src/app/(shell)/system/alerts/page.tsx` — runtime extension.
- `apps/admin-v2/src/app/(shell)/system/alerts/page.test.tsx` — test extension.
- `docs/admin-v2-mvp-3.4b-system-alerts-verification-queue-section.md` — this note.
- `scripts/admin-v2-gates/config.mjs` — `CHECK_PATHS` + `RECONCILIATION_NOTES` anchor
  block for this note.

No other file is touched. No `apps/admin-v2/src/lib/admin-api.server.ts` edit
(`OperationalAlertWorkspace` already includes `'verification_queue'` from 3.4a). No
`apps/admin-v2/src/lib/admin-mutations.server.ts` edit (`createOperationalAlertAction`
is already workspace-agnostic). Zero backend, zero allowlist, zero DTO, zero
controller, zero service, zero evaluator, zero migration, zero `schema.prisma`, zero
new Prisma generation.

## Verification

```bash
yarn workspace @remoola/admin-v2 test --testPathPatterns "system/alerts/page.test"
yarn lint --filter=@remoola/admin-v2
yarn typecheck --filter=@remoola/admin-v2
yarn verify:admin-v2-gates
```

- Targeted page test: 8 passed (6 pre-existing + 2 new); the new test cases assert
  `Filters: status=pending, country=US`, `Filters: (none — total queue)`, the third
  workspace title, the third create-form heading, the third hidden-input
  `value="verification_queue"`, and the three `getOperationalAlerts({ workspace })`
  call sites.
- `git diff --stat` for the slice lists exactly four files (page, test, this note,
  gates config) — the §"Pass conditions" guard in the handoff.
- `yarn verify:admin-v2-gates` reports this note as covered: every required token
  listed in `RECONCILIATION_NOTES['docs/admin-v2-mvp-3.4b-system-alerts-verification-queue-section.md']`
  is present verbatim in the body of this file.

## Follow-ups

- `/verification` fired-state indicator is intentionally not addressed here
  (deferred per 3.4a §1.22 / `Decision: no fired-state indicator on /verification`).
  A future slice may surface a "fired count" indicator on the operator's primary
  workflow page if operator demand emerges.
- `payments`, `payouts`, `exchange`, and `consumer` workspaces remain not
  allowlisted in `OPERATIONAL_ALERT_WORKSPACES`. Extending the allowlist to a
  fourth workspace is out of scope for the entire 3.4 family and is deferred at the
  pack level.
- No follow-up is required on `apps/admin-v2/src/lib/admin-api.server.ts` or any
  backend file — the alerts allowlist parity is now restored end-to-end.
