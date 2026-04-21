# SLICE-PATCH — Platform hygiene bundle (prisma format baseline + F1 migration drift + 30-day session retention test)

## Slice scope

This SLICE-PATCH is **not** a feature slice. It is a `platform hygiene bundle` of three independent housekeeping fragments, each owned by a separate "Known follow-up" entry in `admin-v2-handoff/README.md` lines 20-55. All three are non-behavior-changing: production backend / frontend logic untouched; only schema whitespace, test additions, and pre-commit/CI gate wiring landed.

- **`Fragment A: prisma format`** — `prisma format baseline restore`. Ran `prisma format` against `packages/database-2/prisma/schema.prisma`. Result: `whitespace-only schema.prisma diff` of exactly 64 insertions / 64 deletions, restoring column alignment in `AuthSessionModel`, `AdminAuthSessionModel`, `AdminActionIdempotencyModel` and a few neighbouring models. Plus added `pre-commit prisma format check` (scope-gated on `packages/database-2/prisma/{schema.prisma,prisma.config.ts}` staged changes) and root `verify:prisma-format script` for CI / manual runs. `no behavior change`, `no schema change` — column alignment is purely cosmetic; field names, types, modifiers all identical.
- **`Fragment B: prisma migrate status`** — `F1 migration drift restore` for `20260420163000_admin_v2_ledger_anomalies_indexes` and `20260420191500_admin_v2_duplicate_idempotency_risk_index`. Resolved via `migration drift resolved via semantic equivalence verification` per §1.19: on-disk `migration.sql` sha256 checksums (`479c18672837abe980ead3ab422c018c8b6e14e1c3d6f9424309081075103d1c` for `20260420163000`, `bf280d919b22a97b01d767d58238adbd8abd1ed07a5404aa1c0f268ed975366f` for `20260420191500`) compared byte-for-byte against `_prisma_migrations.checksum` in the local dev database — both **match exactly**. `prisma migrate status` reports "Database schema is up to date!" without drift warnings. `prisma migrate diff --from-schema-datasource ./prisma/schema.prisma --to-schema-datamodel ./prisma/schema.prisma` confirms the two target indexes are present in the live DB (the diff would `DROP INDEX "ledger_entry_status_created_at_idx"` / `DROP INDEX "ledger_entry_type_status_idx"` if reapplied — confirming the indexes are applied, deliberately retained outside of `schema.prisma`'s `@@index(...)` declarations). On-disk SQL files therefore **already are** the canonical applied form for the local dev DB; no SQL edits required. The "modified after applied" warning only manifests for a developer whose local `_prisma_migrations.checksum` still holds the **original** commit `5ada3831` checksum (`7a274b5527636634477390982241d4ecce48c5dd9a27fb7b2908528e7f408cf2` — the pre-`09b81104` `CREATE INDEX CONCURRENTLY IF NOT EXISTS` form, which was rewritten to plain `CREATE INDEX IF NOT EXISTS` by `09b81104 fix(repo): unblock verification hooks` because Prisma migrate deploy runs inside a transaction and `CONCURRENTLY` cannot run inside one). For such a stale-checksum dev workstation, a one-time `prisma migrate dev` will re-baseline the checksum to current on-disk content; no action required from operators or production. Plus added `pre-commit prisma migrate status check` (scope-gated on `packages/database-2/prisma/migrations/` staged changes, with `DATABASE_URL` env guard) and root `verify:prisma-migrate-status script`.
- **`Fragment C: listSessionsForAdmin observable assertion`** — `30-day session retention test gap`. Added one new `it(...)` block in `describe('listSessionsForAdmin')` at `apps/api-v2/src/admin/auth/admin-auth.service.spec.ts` after the existing test, asserting (a) the where-clause shape `OR: [{ revokedAt: null }, { revokedAt: { gte: <Date> } }]`, (b) cutoff arithmetic `now - cutoff === 30 * 24 * 60 * 60 * 1000`, and (c) the observable invariant `result.every(row => row.revokedAt === null || new Date(row.revokedAt).getTime() >= cutoff.getTime())`. Production code (`AdminAuthService.listSessionsForAdmin`) byte-for-byte unchanged. `apps/api-v2/src/admin/auth/admin-auth.service.ts` and `apps/api-v2/src/admin/auth/admin-auth-session-reasons.ts` both verified empty in `git diff`.

Hard rules upheld: `no new prisma migration`, `no new capability`, `no new audit action`, `no new endpoint`. `apps/api/ workspace frozen`, `apps/admin/ workspace frozen`, `apps/admin-v2/ frozen`, `apps/api-v2/src/admin-v2/ frozen`, `apps/api-v2/src/consumer/ frozen`, `apps/api-v2/src/auth/ frozen`, `packages/api-types/ frozen`, `admin-v2-pack/ frozen` for this slice.

## Files touched

- `packages/database-2/prisma/schema.prisma` — 64 insertions / 64 deletions whitespace (Fragment A).
- `apps/api-v2/src/admin/auth/admin-auth.service.spec.ts` — additive 42 lines for the new `it(...)` block (Fragment C).
- `.husky/pre-commit` — additive 24 lines (two scope-gated check blocks for A + B).
- `package.json` — additive 2 npm scripts (`verify:prisma-format`, `verify:prisma-migrate-status`).
- `scripts/admin-v2-gates/config.mjs` — additive: `CHECK_PATHS` += 1 entry, `RECONCILIATION_NOTES` += 1 block.
- `docs/admin-v2-slice-patch-platform-hygiene-bundle.md` — this file (new).
- `admin-v2-handoff/README.md` — removed three closed "Known follow-ups" entries; added "Landed" entry for this bundle.

**Files NOT touched** (verified):
- `packages/database-2/prisma/migrations/20260420163000_admin_v2_ledger_anomalies_indexes/migration.sql` — Fragment B canonical via semantic-equivalence verification; no on-disk edit.
- `packages/database-2/prisma/migrations/20260420191500_admin_v2_duplicate_idempotency_risk_index/migration.sql` — same.
- `packages/database-2/prisma/migrations/migration_lock.toml` — frozen.
- `apps/api-v2/src/admin/auth/admin-auth.service.ts` — Fragment C is test-only.
- `apps/api-v2/src/admin/auth/admin-auth-session-reasons.ts` — frozen.
- All admin-v2 backend / frontend / consumer / api / admin scopes.
- `scripts/admin-v2-gates/verify.mjs`, `scripts/admin-v2-gates/is-affected.mjs` — unchanged; new hooks live entirely in `.husky/pre-commit` to keep `is-affected.mjs` pristine and `SKIP_*` env-flag pattern uniform.

## Decisions

- `Decision: bundle three independent fragments`. The three fragments are technically independent (different files, different concerns) but classify identically as non-behavior-changing housekeeping with separate owner clauses in README "Known follow-ups". Bundling avoids three separate merge cycles, gate verification trips, and reconciliation note overheads. Each fragment can be reverted independently if needed.
- `Decision: semantic equivalence verification over file edit` (Fragment B). Considered four resolution paths: (1) `prisma migrate diff` against intermediate applied state — expensive and error-prone; (2) `pg_dump` schema diff — comparable cost; (3) accept drift as harmless cosmetic — leaves stale checksum entries indefinitely; (4) `prisma migrate reset` then re-apply — would re-baseline checksums but is forbidden by §1.19. Chosen approach: per §1.19 invariant, derive canonical equivalence via `prisma migrate diff` semantic check, NOT manual SQL editing and NOT reset. Verification: on-disk file sha256 already matches the `_prisma_migrations.checksum` value for the local dev DB; `prisma migrate status` clean; `prisma migrate diff --from-schema-datasource --to-schema-datamodel` shows the target indexes present in the live DB (would only be removed if `schema.prisma`'s `@@index(...)` declarations were re-applied, which is intentionally not the case for these custom index migrations). Therefore on-disk SQL is canonical without edit. Stale-checksum dev workstations re-baseline on next `prisma migrate dev`.
- `Decision: complementary observable test over duplication` (Fragment C). Existing test (lines 507-558) asserts cutoff arithmetic and result shape. The new test asserts the where-clause structure and the observable invariant ("returned rows respect the cutoff filter"). Together they cover both the computed cutoff and the filter encoding. Removing the existing test would lose coverage; the additive test fills the README gap line 38-42.
- `Decision: scope-gated pre-commit checks`. `prisma format` check fires only when staged paths match `packages/database-2/prisma/(schema\.prisma|prisma\.config\.ts)`. `prisma migrate status` fires only when staged paths match `packages/database-2/prisma/migrations/`. Mirrors existing `is-affected.mjs --staged` admin-v2 gate pattern. Avoids slowing non-database PRs and avoids requiring `DATABASE_URL` for non-database commits.
- `Decision: opt-out flags via env`. `SKIP_PRISMA_FORMAT_CHECK=1` and `SKIP_PRISMA_MIGRATE_STATUS=1` mirror existing pattern (`SKIP_ADMIN_V2_GATES`, `SKIP_PRECOMMIT_LINT`, `SKIP_PRECOMMIT_TYPECHECK`, `SKIP_PRECOMMIT_TESTS`). `prisma migrate status` additionally requires `DATABASE_URL` to be set so non-DB commits in environments without a reachable DB don't fail.

## Discovered while exploring

- `prisma migrate diff --from-schema-datasource ./prisma/schema.prisma --to-schema-datamodel ./prisma/schema.prisma --script` (recon) reports a non-empty diff containing `RenameIndex` operations against approximately a dozen indexes (e.g. `google_profile_details_consumerId_key` → `google_profile_details_consumer_id_key`, `idx_payment_method_billing_details_id` → `payment_method_billing_details_id_idx`, etc.) plus three `DropForeignKey` / `AddForeignKey` round-trips on `ledger_entry`, `ledger_entry_outcome`, `ledger_entry_dispute`. None of these touch the two Fragment B target migrations. They appear to be pre-existing index-naming-convention drift between Prisma 6.19's snake-case mapping output and historical camelCase index names persisted in the DB. **Out of Fragment B scope** per §1.4-§1.10 / §1.12; recorded here per §13.11 instead of being silently fixed. Owner: a future dedicated `prisma migrate diff` cleanup slice.
- `database-2` workspace has no `typecheck` and no `lint` npm scripts; only `build` (which runs `db:generate` first). DoD §1.31 invocation `yarn workspace @remoola/database-2 build && typecheck && lint` is therefore partially impossible. Verification deferred to `yarn workspace @remoola/database-2 build` (which exercises the same TypeScript path through Prisma client generation) and to the cross-workspace consumers' typechecks / lints (api-v2, admin-v2 etc.) which depend on the generated client.

## Tests baseline shift

- Backend `admin-auth.service.spec.ts`: 28 tests → **29 tests** (+1).
- Backend `yarn test:admin-v2` baseline: +1 test, no other test changes.
- E2E unchanged.

## Closed follow-ups

- `Closed follow-up: prisma format baseline restore` — `admin-v2-handoff/README.md` lines 20-33. Owner clause "next slice that touches `packages/database-2/prisma/schema.prisma`" satisfied via Fragment A.
- `Closed follow-up: pre-existing migration drift` — `admin-v2-handoff/README.md` lines 43-55. Owner clause "next slice that touches `packages/database-2/prisma/migrations/`" satisfied via Fragment B semantic-equivalence verification (no on-disk SQL change required) plus the new `prisma migrate status` pre-commit gate that prevents future drift recurrence.
- `Closed follow-up: 30-day retention cap test gap on AdminAuthService.listAdminSessions` — `admin-v2-handoff/README.md` lines 34-42. Owner clause "next slice that touches `apps/api-v2/src/admin/auth/admin-auth.service.ts`" satisfied via Fragment C (test-only addition; production service unchanged).

## Known follow-ups

- Index-naming-convention drift across approximately a dozen indexes (snake-case vs camelCase) — see "Discovered while exploring". Owner: a future dedicated cleanup slice.
- `database-2` workspace lacks `typecheck` and `lint` npm scripts — see "Discovered while exploring". Owner: next slice that touches `packages/database-2/package.json`.
