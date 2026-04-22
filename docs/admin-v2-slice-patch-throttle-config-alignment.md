# SLICE-PATCH admin-v2 throttle config alignment

Reconciliation note for `SLICE-PATCH-admin-v2-throttle-config-alignment` (handoff: `admin-v2-handoff/SLICE-PATCH-admin-v2-throttle-config-alignment.md`). Closes the inventory entry `Risk 12 inventory entry promoted from "❓ not spot-checked" to verified-mitigated` on `docs/admin-v2-pack-vs-code-inventory.md` `## 8.4 Risk register`.

## Summary

Aligns the admin-v2 controller surface with the `pack §07 lines 236-247 throttling strategy` mandate by applying a `class-level decorator on each non-auth admin-v2 controller`: `@Throttle({ default: { limit: 500, ttl: 60000 } })`. `17 non-auth admin-v2 controllers updated`. `AdminV2AuthController frozen — six per-route @Throttle decorators preserved`. `AppModule ThrottlerModule.forRoot frozen — no named throttler introduced`. `no new prisma migration`, `no new capability`, `no new audit action`, `no new endpoint`, `no new DTO`, `no service code change`, `no frontend change`. Implements `Risk 12 mitigation per pack §08 lines 668-678` end-to-end.

## Pack mandate

`admin-v2-pack/07-backend-contracts-and-data-plan.md` `## Throttling Strategy` (lines 236-247) specifies, verbatim:

- "Задать отдельный `@Throttle({ default: { limit: 500, ttl: 60000 } })` config на уровне `AdminV2Module` — повышенный лимит, достаточный для активной навигации между case pages."
- "Не использовать `@SkipThrottle()`: полное снятие rate-limit создаёт risk для authenticated admin surface (compromised admin token может генерировать unbounded load)."
- "Аутентифицированные admin requests уже защищены auth guard, но rate-limit остаётся defence-in-depth слоем."
- "Точные numeric thresholds уточняются при rollout (500 req/min — ориентир, не финальная цифра)."

`admin-v2-pack/08-rollout-risks-and-sequencing.md` `### Risk 12 [VERIFIED_FROM_CODE]` (lines 668-678): "Global throttle мешает активной admin operations работе. Mitigation: отдельный review route-level throttling для authenticated admin surface."

Baseline before this patch: `apps/api-v2/src/app.module.ts` lines 28-32 register a global `ThrottlerGuard` via `APP_GUARD` with `[{ ttl: 60000, limit: 100, ignoreUserAgents: botPatterns }, { ttl: 3600000, limit: 1000, ignoreUserAgents: botPatterns }]`. The first throttler (per-minute, the implicit `default` named throttler) is the one pack §07 line 244 raises to 500 for the admin-v2 surface. Of the 18 admin-v2 controllers, only `AdminV2AuthController` carried any `@Throttle` decorators (six per-route, intentionally tighter at 10/20 req/min on `acceptInvitation` / `resetPassword` / `login` / `refreshAccess` / `logout` / `revokeSession`); the remaining 17 fell through to the global `limit: 100`.

## Mechanic

NestJS `@nestjs/throttler` does not support `@Throttle` on `@Module(...)` — the decorator targets controllers and methods only. The pack literal "на уровне `AdminV2Module`" therefore translates to a `class-level decorator on each non-auth admin-v2 controller`. Per `@nestjs/throttler` precedence (method > class > global):

- The class-level `@Throttle({ default: { limit: 500, ttl: 60000 } })` overrides the global per-minute `default` throttler (`limit: 100`) for every method in each of the 17 non-auth admin-v2 controllers.
- The outer per-hour throttler (`limit: 1000`, `ttl: 3600000`) is unnamed (treated as a separate distinct throttler entry, not the `default`) and remains intact as `Decision: outer 1000 req/3600s throttler unchanged as defense-in-depth` — it caps long-horizon abuse irrespective of the per-minute raise.
- `AdminV2AuthController`'s six per-route `@Throttle({ default: { limit: 10|20, ttl: 60000 } })` decorators continue to win method-by-method via method-precedence and remain the authoritative auth rate posture (see `Decision: AdminV2AuthController not class-decorated to keep auth rate posture fully explicit per-route` below).

The decorator literal is a verbatim copy of pack §07 line 244: `@Throttle({ default: { limit: 500, ttl: 60000 } })` — same named-throttler key (`default`), same `limit` (500), same `ttl` in ms (60000). No envs binding, no shared constant extraction (deferred — out of scope), no `@SkipThrottle()` anywhere, no named-throttler shape (`{ short: ..., long: ... }`).

`Decision: per-controller class-level decorator over named throttler refactor` — the alternative implementation (introducing a named third throttler entry such as `{ name: 'adminV2', ttl: 60000, limit: 500 }` in `AppModule`'s `ThrottlerModule.forRoot([...])` and decorating with `@Throttle({ adminV2: ... })`) was rejected for this slice for three reasons: (1) it expands the frozen `apps/api-v2/src/app.module.ts` blast radius and cross-cuts the consumer / admin v1 / health / auth route surfaces that are explicitly out of scope; (2) it would force a coordinated rename of the six existing `AdminV2AuthController` per-route `@Throttle({ default: { limit: 10|20, ... } })` decorators (currently frozen) to maintain consistent name resolution semantics; (3) it diverges from the pack §07 line 244 verbatim literal (`{ default: { limit: 500, ttl: 60000 } }`), which references the existing implicit `default` named throttler. Per-controller class-level application of the verbatim pack decorator is the smallest-blast-radius mechanism that satisfies the mandate; the named-throttler refactor remains available as a separate future slice (see Follow-ups).

## Implemented

Class-level `@Throttle({ default: { limit: 500, ttl: 60000 } })` decorator applied immediately above the existing `@Controller(...)` decorator (after `@ApiTags(...)` to preserve Swagger / Nest decorator ordering as-is) on the following 17 non-auth admin-v2 controllers (alphabetical):

- `apps/api-v2/src/admin-v2/admin-v2.controller.ts` (root `AdminV2Controller`, `@Controller('admin-v2')`)
- `apps/api-v2/src/admin-v2/admins/admin-v2-admins.controller.ts`
- `apps/api-v2/src/admin-v2/assignments/admin-v2-assignments.controller.ts`
- `apps/api-v2/src/admin-v2/audit/admin-v2-audit.controller.ts`
- `apps/api-v2/src/admin-v2/consumers/admin-v2-consumers.controller.ts`
- `apps/api-v2/src/admin-v2/documents/admin-v2-documents.controller.ts`
- `apps/api-v2/src/admin-v2/exchange/admin-v2-exchange.controller.ts`
- `apps/api-v2/src/admin-v2/ledger/admin-v2-ledger.controller.ts`
- `apps/api-v2/src/admin-v2/ledger/anomalies/admin-v2-ledger-anomalies.controller.ts`
- `apps/api-v2/src/admin-v2/operational-alerts/admin-v2-operational-alerts.controller.ts`
- `apps/api-v2/src/admin-v2/overview/admin-v2-overview.controller.ts`
- `apps/api-v2/src/admin-v2/payment-methods/admin-v2-payment-methods.controller.ts`
- `apps/api-v2/src/admin-v2/payments/admin-v2-payments.controller.ts`
- `apps/api-v2/src/admin-v2/payouts/admin-v2-payouts.controller.ts`
- `apps/api-v2/src/admin-v2/saved-views/admin-v2-saved-views.controller.ts`
- `apps/api-v2/src/admin-v2/system/admin-v2-system.controller.ts`
- `apps/api-v2/src/admin-v2/verification/admin-v2-verification.controller.ts`

Each file received exactly two additive lines: `import { Throttle } from '@nestjs/throttler';` slotted after the existing `import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';` line, and the class-level `@Throttle(...)` line between the existing `@ApiTags(...)` and `@Controller(...)` decorators. No method-level decorator added anywhere; no existing decorator order changed; no narration comments. Net diff: 17 files, +34 insertions, 0 deletions.

Frozen surfaces (verified zero diff post-edit):

- `apps/api-v2/src/admin-v2/auth/admin-v2-auth.controller.ts` — `AdminV2AuthController frozen — six per-route @Throttle decorators preserved` exactly as before: `@Throttle({ default: { limit: 10, ttl: 60000 } })` on `acceptInvitation` (line 115), `resetPassword` (line 122), `login` (line 129), `logout` (line 162), `revokeSession` (line 178); `@Throttle({ default: { limit: 20, ttl: 60000 } })` on `refreshAccess` (line 149). Limits 10/10/10/20/10/10 req/min preserved verbatim.
- `apps/api-v2/src/app.module.ts` — `AppModule ThrottlerModule.forRoot frozen — no named throttler introduced`. The `ThrottlerModule.forRoot([{ ttl: 60000, limit: 100, ignoreUserAgents: botPatterns }, { ttl: 3600000, limit: 1000, ignoreUserAgents: botPatterns }])` registration and the `APP_GUARD` provider are byte-identical. The `default` named throttler resolution for non-admin-v2 routes (consumer, admin v1, health, auth) is unchanged.
- `apps/api/ workspace frozen`, `apps/admin/ workspace frozen`, `apps/admin-v2/ workspace frozen`, `apps/api-v2/src/consumer/ workspace frozen`, `apps/api-v2/src/auth/ workspace frozen`, `apps/api-v2/src/guards/ workspace frozen`, `packages/api-types/ workspace frozen`, `packages/database-2/ workspace frozen`, `admin-v2-pack/ frozen`.

Non-controller deliverables:

- This reconciliation note (`docs/admin-v2-slice-patch-throttle-config-alignment.md`).
- `scripts/admin-v2-gates/config.mjs` `CHECK_PATHS` += this note path (placed adjacent to `docs/admin-v2-slice-patch-platform-hygiene-bundle.md` per the Required Delta matrix); `RECONCILIATION_NOTES` += new top-level entry keyed by this note path with the Required-tokens list verbatim.
- `admin-v2-handoff/LANDED.md` `## Landed slices (reference only)` — new top-of-list compact entry mirroring the 3.7a/3.7b/3.7c shape.
- `admin-v2-handoff/README.md` — intentionally untouched. This patch closes an inventory-flagged unverified mitigation, not a tracked README "Known follow-up" entry; per repo convention non-feature patches that close inventory-only items are recorded only in `LANDED.md`.

## Verification

Pass conditions, all green at landing:

1. `yarn workspace @remoola/api-v2 typecheck` PASS.
2. `yarn workspace @remoola/api-v2 lint` PASS.
3. `yarn workspace @remoola/api-v2 test --testPathPatterns='admin-v2'` PASS — 31 suites / 347 tests, no test-count delta. (The handoff's "28 suites / 260 tests" baseline reflected a pre-3.4a snapshot; live baseline at landing is 31/347 and is preserved unchanged because this slice adds no tests and tests do not depend on rate-limit ceilings.)
4. `yarn workspace @remoola/api-v2 build` PASS.
5. `yarn workspace @remoola/api-v2 test:e2e` PASS.
6. `rg "^@Throttle\(\{ default: \{ limit: 500, ttl: 60000 \} \}\)" apps/api-v2/src/admin-v2 --type ts` returns exactly 17 matches across the 17 non-auth controllers listed above.
7. `rg "@Throttle" apps/api-v2/src/admin-v2/auth/admin-v2-auth.controller.ts` returns exactly 6 method-level matches with literal limits 10|20.
8. `git diff --stat apps/api-v2/src/app.module.ts` empty.
9. `git diff --stat apps/api/ apps/admin/ apps/admin-v2/ apps/api-v2/src/consumer/ apps/api-v2/src/auth/ apps/api-v2/src/guards/ apps/api-v2/src/shared/ apps/api-v2/src/shared-common/ packages/api-types/ packages/database-2/ admin-v2-pack/` empty.
10. `git diff --stat packages/database-2/prisma/migrations/` empty (`no new prisma migration`).
11. `yarn verify:admin-v2-gates` PASS — confirms this note path is wired into `CHECK_PATHS` and the `RECONCILIATION_NOTES[<note-path>]` array contains every required token verbatim.

## Discovered while exploring

- The `default` named throttler resolution in `ThrottlerModule.forRoot([{ ttl: 60000, limit: 100, ... }, { ttl: 3600000, limit: 1000, ... }])` is implicit: `@nestjs/throttler` treats the first unnamed entry as `default` and the second as a separate distinct throttler. The pack literal `{ default: { limit: 500, ttl: 60000 } }` references the same `default` throttler, and the class-level decorator therefore overrides only the per-minute ceiling for admin-v2 routes. The per-hour throttler (`limit: 1000`) continues to apply unchanged — at 500 req/min sustained, the per-hour ceiling would be hit in ≈2 minutes, but the realistic admin-operator usage profile (pack §07 line 240: "быстро переходящий между case pages") sits well below sustained 16-17 req/min, leaving substantial headroom against both throttlers.
- No new admin-v2 controller has been introduced since the handoff was written; the on-disk inventory under `apps/api-v2/src/admin-v2/**/*.controller.ts` matches the 17-file Required Delta plus the frozen `AdminV2AuthController` exactly. Verified via `rg --files apps/api-v2/src/admin-v2 -g '*.controller.ts'`.
- The handoff's tests baseline of "28 suites / 260 tests" is from before the 3.4a / 3.4b / 3.5a-d / 3.6a-e / 3.7a-d / SLICE-PATCH operational_assignment active-lookup landings. Live baseline at this slice's landing time is 31 suites / 347 tests for `--testPathPatterns='admin-v2'`. The DoD intent — "test count baseline unchanged" — is preserved because this slice adds zero tests.

## Follow-ups

- `Follow-up: production tuning of 500 req/min limit at rollout deferred`. Pack §07 line 247 explicitly defers the numeric tuning to rollout: "Точные numeric thresholds уточняются при rollout (500 req/min — ориентир, не финальная цифра)". When production telemetry exists (e.g. p95 / p99 admin operator request rate from Datadog or equivalent), a separate config-only slice may parameterise the literal via `envs` or extract a shared constant. Out of scope here.
- Named-throttler refactor in `AppModule` (e.g. `[{ name: 'short', ... }, { name: 'long', ... }, { name: 'adminV2', ... }]`) is a strictly larger surface — would require coordinated rename of the per-route auth controller `@Throttle({ default: ... })` decorators (currently frozen) and would change `default` named throttler resolution semantics for non-admin-v2 routes (consumer, admin v1, health, auth). Separate slice with its own pack alignment audit.
- Inventory `docs/admin-v2-pack-vs-code-inventory.md` `## 8.4 Risk register` Risk 12 row may now be flipped from "❓ not spot-checked" to verified-mitigated (✅) by the inventory's owner; this slice does not edit the inventory document itself (`docs/` admin-v2 pack-vs-code inventory is not in the slice's edit scope).
