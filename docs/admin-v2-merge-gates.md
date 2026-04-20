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
- the expected anchor paths exist for the current admin-v2 surface:
  `apps/admin-v2/src/app`, `apps/admin-v2/src/lib/admin-mutations.server.ts`,
  `apps/api-v2/src/admin-v2`,
  `apps/api-v2/src/shared/admin-action-audit.service.ts`,
  `apps/api-v2/src/auth/jwt.strategy.ts`,
  `apps/api-v2/src/auth/jwt.guard.ts`,
  `apps/api-v2/src/guards/auth.guard.ts`,
  `apps/api-v2/src/shared-common/csrf-protection.ts`,
  `apps/api-v2/src/shared/origin-resolver.service.ts`,
  `packages/api-types/src/http/admin-path.ts`,
  `packages/api-types/src/http/auth-cookie-policy.ts`,
  `admin-v2-pack/05-financial-workspaces.md`,
  and `docs/admin-v2-mvp-2-rbac-prerequisite.md`
- the expected capability and audit anchors are present in
  `apps/api-v2/src/shared/admin-action-audit.service.ts` and
  `apps/api-v2/src/admin-v2/admin-v2-access.ts`, including the required
  breadth-write audit actions and capabilities used by the current admin-v2
  surface
- frontend server-action exports are present in
  `apps/admin-v2/src/lib/admin-mutations.server.ts` for payment methods,
  exchange, documents and admins mutations
- the expected backend route tokens are present in the admins, payment
  methods, exchange, documents and payouts controllers so the gate can catch
  obvious route drift
- reconciled planning docs still say that schema-backed RBAC is landed,
  payment methods are no longer read-only-only, and the next sequence is
  `MVP-3` maturity rather than another MVP-2 kickoff
- the anomaly first maturity slice reconciliation note still contains the
  required Sequence 6, read-only, temporarily-unavailable, and currency
  coverage decisions used by the current gate config

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

It does not run `yarn test:admin-v2` in pre-commit. The repo-wide lint/test
behavior in pre-commit has been narrowed for speed:

- lint runs only on staged files via `lint-staged` (per-workspace ESLint flat
  configs, with each workspace's existing `--max-warnings` strictness preserved)
- typecheck runs only for the staged TS/TSX files via
  `node ./scripts/typecheck-staged.mjs`. The script invokes the workspace's full
  `tsc --noEmit` (so types resolve correctly with the whole project graph) and
  filters compiler output: errors located in staged files block the commit,
  while pre-existing errors in untouched files are summarized as a single info
  line per workspace and do not block
- unit tests run only for affected workspaces via
  `turbo run test --filter='...[HEAD^1]'`
- `test:e2e:fast` no longer runs in pre-commit; it has moved to
  `.husky/pre-push` so coverage before the branch leaves the machine is
  preserved without slowing every commit
- the `scripts/pre-commit-needs-lint-and-tests.sh` short-circuit is restored,
  so docs-only and other non-`apps/`/`packages/` commits skip lint and tests
  entirely

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
- `SKIP_PRECOMMIT_TYPECHECK=1 git commit ...` skips the staged-file typecheck.
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
