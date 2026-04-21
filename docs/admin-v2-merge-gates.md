# Admin-v2 merge gates

This document describes the current local `admin-v2` gate setup. It covers
only checks that already exist today, plus the main things we still review
manually.

Run the current local checks with:

```sh
yarn verify:admin-v2-gates
yarn test:admin-v2
```

## Current Checks

### `yarn verify:admin-v2-gates`

This is a deterministic local check implemented in
`scripts/admin-v2-gates/verify.mjs`. It checks:

- the root scripts for `verify:admin-v2-gates` and `test:admin-v2` are wired
- `.husky/pre-commit` conditionally runs `yarn verify:admin-v2-gates` when the
  staged diff touches the admin-v2 gate/tooling surface
- `docs/admin-v2-merge-gates.md` matches the current setup and does not claim
  checks that do not exist
- every anchor path listed in `CHECK_PATHS` in
  `scripts/admin-v2-gates/config.mjs` exists in the working tree (currently
  spans the admin-v2 frontend surface, the api-v2
  admin-v2/auth/csrf surface, the api-types HTTP surface, the
  admin-v2-pack planning files used by the gate, and the live admin-v2
  docs plus the 3.1c perf/reconciliation artifacts, the additive migration
  READMEs, the 3.2a operational-assignments reconciliation note, the
  3.3a saved-views skeleton reconciliation note plus its
  saved_view foundation migration README, the   3.3b operational-alerts
  skeleton reconciliation note plus its operational_alert foundation
  migration README, the 3.4a verification-workspace-completion
  reconciliation note plus its `verification_queue` workspace allowlist
  migration README, and the 3.5a admin-auth-hardening plaintext
  retirement reconciliation note (Risk 13 mitigation track step 1 of 4));
  the config file is the single
  source of truth — do not duplicate the list here
- the expected capability and audit anchors are present in
  `apps/api-v2/src/shared/admin-action-audit.service.ts` and
  `apps/api-v2/src/admin-v2/admin-v2-access.ts`, including the audit actions
  and capabilities used by the current admin-v2 surface (a mix of read and
  write entries listed in `scripts/admin-v2-gates/config.mjs`)
- frontend server-action exports are present in
  `apps/admin-v2/src/lib/admin-mutations.server.ts` for payment methods,
  exchange, documents, admins, operational assignments, saved views, and
  operational alerts mutations
- the expected backend route tokens are present in the admins, payment
  methods, exchange, documents, payouts, assignments, saved-views, and
  operational-alerts controllers so the gate can catch obvious route drift
- the reconciliation tokens listed in `RECONCILIATION_NOTES` in
  `scripts/admin-v2-gates/config.mjs` are present in the corresponding
  planning and docs files (currently spanning
  `docs/admin-v2-mvp-2-rbac-prerequisite.md`,
  `admin-v2-pack/05-financial-workspaces.md`,
  `admin-v2-pack/08-rollout-risks-and-sequencing.md`, and
  `docs/admin-v2-mvp-3-anomalies-first-slice.md`,
  `docs/admin-v2-mvp-3.1c-anomaly-classes-expansion.md`,
  `docs/admin-v2-mvp-3.1c-perf-evidence.md`,
  `docs/admin-v2-mvp-3.2a-operational-assignments.md`,
  `docs/admin-v2-mvp-3.3a-saved-views-skeleton.md`,
  `docs/admin-v2-mvp-3.3b-operational-alerts-skeleton.md`,
  `docs/admin-v2-mvp-3.4a-verification-workspace-completion.md`, and
  `docs/admin-v2-mvp-3.5a-admin-auth-hardening-plaintext-retirement.md`);
  see the
  config for the authoritative token list, including the schema-backed
  RBAC, payment methods write controls, MVP-3 maturity sequencing, and
  anomaly first maturity slice plus the 3.1c classes expansion / EXPLAIN
  ANALYZE evidence, the 3.2a operational assignments decisions, the 3.3a
  saved views skeleton decisions, the 3.3b operational alerts
  skeleton decisions, the 3.4a verification-workspace-completion
  decisions, and the 3.5a admin-auth-hardening plaintext-retirement
  decisions used by the current gate

After 3.3b lands, the MVP-3 maturity exit criteria from
`admin-v2-pack/08-rollout-risks-and-sequencing.md` are fully closed.
Subsequent slices (additional workspaces, additional threshold types,
occurrence history, additional delivery channels, ack/snooze, manual
re-evaluate, link from `/system/page.tsx` to `/system/alerts`,
"Create alert from this filter" shortcut on `/ledger/anomalies/page.tsx`)
are post-MVP-3 expansion work and ship as their own slices.

### Risk 13 mitigation track (post-MVP-3, hardening)

Risk 13 (admin auth plaintext-fallback / legacy controller retirement)
is being closed in four sequential slices, all post-MVP-3 hardening:

- **3.5a** (this slice, landed): backend hardening — `verified.sid`
  mandatory on admin path in `auth.guard.ts`, `AdminAuthService.refreshAccess`
  is session-only, `getLegacyAccessAndRefreshToken` and `findIdentityAccess`
  removed, `revokeSessionByRefreshToken` simplified, and
  `AdminV2AuthController.revokeSession` now writes dual audit (existing
  `AUTH_AUDIT_EVENTS.logout` + new `ADMIN_ACTION_AUDIT_ACTIONS.admin_session_revoke`).
  No schema migration. Legacy `AdminAuthController` and admin-v2 frontend
  URLs intentionally retained — see the reconciliation note for the staged
  plan.
- **3.5b** (pending): admin-v2 frontend URL migration to `/api/admin-v2/auth/*`.
- **3.5c** (pending): legacy `AdminAuthController` retirement after frontend
  migration lands.
- **3.5d** (pending): session-management observability — `me/sessions`
  listing, cross-admin revoke endpoint with `admins.manage` capability,
  `revoke_reason` enum, and `refresh_reuse` alert wiring.

### `yarn test:admin-v2`

This runs the existing targeted API v2 Jest scope:

```sh
yarn workspace @remoola/api-v2 run test --testPathPatterns='admin-v2'
```

This stays a manual local check for now. We rely on `pre-commit` plus manual
local runs before merge when touching the admin-v2 gate surface.

## Pre-commit

`.husky/pre-commit` does one admin-v2-specific thing:

- if the staged diff touches the admin-v2 gate/tooling surface, it runs the
  same checks as `yarn verify:admin-v2-gates` (invoked directly via `node
  ./scripts/admin-v2-gates/verify.mjs` to skip the extra Yarn startup)

It does not run `yarn test:admin-v2` in pre-commit. The repo-wide
lint/typecheck/test behavior in pre-commit has been narrowed for speed:

- lint runs only on staged files via `lint-staged` (per-workspace ESLint flat
  configs, with each workspace's existing `--max-warnings` strictness preserved)
- typecheck runs only on staged TS/TSX files via
  `scripts/typecheck-staged.mjs` (per-workspace `tsc`, with errors filtered
  to the staged file set; pre-existing errors in untouched files become an
  info line)
- unit tests run only for affected workspaces via
  `turbo run test --filter='...[HEAD^1]'`, preceded by a one-shot
  `yarn workspace @remoola/test-db run build` so per-workspace `pretest`
  hooks find the test-db artifact already built
- `test:e2e:fast` no longer runs in pre-commit; it has moved to
  `.husky/pre-push` so coverage before the branch leaves the machine is
  preserved without slowing every commit
- the `scripts/pre-commit-needs-lint-and-tests.sh` short-circuit is restored,
  so docs-only and other non-`apps/`/`packages/` commits skip lint,
  typecheck, and tests entirely

`.husky/pre-push` runs `yarn lint` and (unless `SKIP_PREPUSH_E2E=1`) the
`apps/api` `test:e2e:fast` smoke before the branch leaves the machine, so
the e2e coverage that pre-commit no longer carries still runs locally before
push.

For this local gate setup, we currently rely on:

- `pre-commit` for deterministic gate wiring checks plus staged-file lint and
  affected-workspace unit tests
- `pre-push` for the `test:e2e:fast` smoke
- manual local runs of `yarn test:admin-v2` before merge when the touched scope
  can affect admin-v2 behavior

### Bypass flags

Use these only when you understand the trade-off; CI still enforces the full
matrix on the branch.

- `SKIP_ADMIN_V2_GATES=1 git commit ...` skips just the admin-v2 gate.
- `SKIP_PRECOMMIT_LINT=1 git commit ...` skips `lint-staged`.
- `SKIP_PRECOMMIT_TYPECHECK=1 git commit ...` skips
  `scripts/typecheck-staged.mjs`.
- `SKIP_PRECOMMIT_TESTS=1 git commit ...` skips the affected-workspace unit
  tests.
- `SKIP_PREPUSH_E2E=1 git push ...` skips `test:e2e:fast` for an emergency push.
- `git commit --no-verify` remains the nuclear bypass.

`admin-v2-pack/implementation-prompts-composer2-fast/**` is intentionally not
part of this gate slice.

## Still Manual

The following checks are still manual and are not claimed as automation here:

- transaction-matrix completeness or HTTP method drift checks
- allowlist-based contract suppression or anchor parsing
- side-effects map completeness
- RBAC capability-to-doc table completeness
- rollout phase matrix completeness
- navigation tier, cross-link, or dead-end page checks
- taxonomy enforcement across the planning pack
- SLA tuple completeness
- CSRF integration coverage for every representative admin-v2 write
- uniform `STALE_VERSION` integration coverage across all mutators
- semantic diff between pack prose and every rendered UI string
- ledger anomalies performance proof (`EXPLAIN ANALYZE`, endpoint p95, and
  migration rollout timing) beyond deterministic string anchors

These items still need manual review or a dedicated follow-up slice. They
should not be treated as automated checks based on this document.

## Known Gaps

- `consumer_flag_remove` method drift (`PATCH` in canonical planning vs `POST`
  in runtime) remains outside this deterministic string-anchor check.
- The gate checks representative route tokens, not a full endpoint-to-doc
  reconstruction.
- Any deeper completeness gate that needs markdown parsing, allowlists, or
  semantic endpoint classification is intentionally not introduced here.
