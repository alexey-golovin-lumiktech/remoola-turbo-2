# MVP-3.5c Admin Auth Hardening — Legacy `AdminAuthController` Retirement (api-v2 workspace)

> Status: landed | Phase: post-MVP-3 (Risk 13 mitigation step 3 of 4) | Builds on: 3.5a backend hardening (`AdminAuthSessionModel`-only auth path), 3.5b admin-v2 frontend URL migration (`/api/admin-v2/auth/*`), pack §03 lines 196-217, pack §08 Risk 13 lines 680-693

> Slice anchors (gate tokens, do not edit casing): MVP-3.5c, Risk 13, legacy AdminAuthController retirement, admin-auth.controller.ts deleted, admin-auth.controller.spec.ts deleted, admin.module.ts controllers field removed, AdminAuthController unregistered from AdminModule, /api/admin/auth/* removed from api-v2 backend, /api/admin-v2/auth/* sole admin auth surface in api-v2, admin-auth-lifecycle.e2e-spec migrated, admin-step-up.e2e-spec login mechanism migrated, admin-payment-reversal.e2e-spec login mechanism migrated, jwt.strategy.spec fixture migrated, consumer-action.interceptor.spec fixture migrated, swagger-cookie-auth description literals migrated, swagger-cookie-auth.spec assertions migrated, apps/api-v2/README.md migrated, AdminAuthService retained (shared with admin-v2), AdminAuthModule retained (provides AdminAuthService to admin-v2), AdminV2AuthController unchanged, Credentials DTO retained (used by admin-v2), cookie helpers unchanged, CSRF flow unchanged, request body unchanged, response shape unchanged, no schema migration, no new capability, no new audit action, no new endpoint, no new DTO, apps/api/ workspace frozen (separate retirement track), apps/admin/ workspace frozen, apps/admin-v2/ frozen (already migrated in 3.5b), Decision: production helpers tolerant via isAdminApiPath, Decision: SWAGGER_PROTECTED_PATH_PREFIXES_BY_AUDIENCE.admin retained at /api/admin/, Decision: controllers field removed not emptied, Decision: no shim routes for legacy /api/admin/auth/* in api-v2, Decision: AdminAuthService kept as shared admin-v2 dependency, Known dev-UX limitation: Swagger CSRF auto-mirror gap for /api/admin-v2/, Old api-v2 URLs return 404 after deploy.

## Scope landed

- `apps/api-v2/src/admin/auth/admin-auth.controller.ts` — **deleted** (128 lines). Removed `AdminAuthController` class with endpoints `@Post('login')`, `@Post('refresh-access')`, `@Post('logout')`, `@Get('me')` under `@Controller('admin/auth')`.
- `apps/api-v2/src/admin/auth/admin-auth.controller.spec.ts` — **deleted** (184 lines, 5 test cases). Removed test suite for the deleted controller.
- `apps/api-v2/src/admin/admin.module.ts` — edited:
  - Removed `import { AdminAuthController } from './auth/admin-auth.controller';` (was line 3).
  - Removed `controllers: [AdminAuthController]` field entirely from `@Module({ ... })` decorator (was line 28). Field removed (not emptied to `controllers: []`) for cleaner diff; NestJS treats absent and empty array equivalently.
  - `AdminAuthModule` import (line 4 → line 3 after edit) and its presence in `imports` array — **retained**, because `apps/api-v2/src/admin-v2/admin-v2.module.ts:26` and `apps/api-v2/src/admin-v2/admins/admin-v2-admins.module.ts:11` import `AdminAuthModule` for DI of shared `AdminAuthService`.
- `apps/api-v2/test/admin-auth-lifecycle.e2e-spec.ts` — eight URL substitutions (`/api/admin/auth/*` → `/api/admin-v2/auth/*`) on lines 92, 93, 100, 114, 119, 131, 134, 142. Cookie keys, DTO body, CSRF header, response shape — unchanged. `AdminV2AuthController` provides identical contract for `login`, `refresh-access`, `logout`, `me`.
- `apps/api-v2/test/admin-step-up.e2e-spec.ts` — five URL substitutions on lines 118, 140, 161, 184, 205. All five are `POST /api/admin/auth/login` → `POST /api/admin-v2/auth/login` as setup mechanism for step-up flows on `/api/admin/admins/*` routes (admin v1, frozen).
- `apps/api-v2/test/admin-payment-reversal.e2e-spec.ts` — two URL substitutions on lines 218, 268. Both are login mechanism; tested `/api/admin/payment-requests/*` routes (admin v1, frozen) untouched.
- `apps/api-v2/src/auth/jwt.strategy.spec.ts` — fixture path (line 93) migrated `/api/admin/auth/me` → `/api/admin-v2/auth/me`. Production helper `isAdminApiPath()` from `packages/api-types/src/http/admin-path.ts:1-9` accepts both prefixes (`ADMIN_API_PATH_PREFIXES = ['/api/admin/', '/api/admin-v2/']`); test behavior identical, fixture now reflects post-3.5c reality.
- `apps/api-v2/src/common/interceptors/consumer-action.interceptor.spec.ts` — fixture path (line 127) migrated `/api/admin/auth/login` → `/api/admin-v2/auth/login`. `ConsumerActionInterceptor` checks `!isConsumerApiPath(request.path)` (line 42) and bails out for any admin path independent of namespace; test assertion `expect(...record).not.toHaveBeenCalled()` holds for both prefixes.
- `apps/api-v2/src/swagger-cookie-auth.ts` — three description literals updated in `buildSwaggerCookieAuthDescription('admin', ...)` on lines 56, 61, 64:
  - `POST /api/admin/auth/login` → `POST /api/admin-v2/auth/login`
  - `POST /api/admin/auth/refresh-access` → `POST /api/admin-v2/auth/refresh-access`
  - `POST /api/admin/auth/logout` → `POST /api/admin-v2/auth/logout`
- `apps/api-v2/src/swagger-cookie-auth.spec.ts` — two assertions updated on lines 31, 32 to match new description literals.
- `apps/api-v2/README.md` — single bullet updated on line 27: `POST /api/admin/auth/*` → `POST /api/admin-v2/auth/*`.

After this slice, in `apps/api-v2/`:
- `rg "/api/admin/auth/" apps/api-v2/` returns **0 matches**.
- `rg "AdminAuthController" apps/api-v2/` returns **0 matches**.
- `rg "/api/admin-v2/auth/" apps/api-v2/` returns matches in 8 files (3 e2e specs, 2 unit specs, swagger module + spec, README) — exact count depends on per-file URL-uses.

Endpoints `/api/admin/auth/{login,refresh-access,logout,me}` in api-v2 backend → 404 after deploy. Intentional side-effect (admin-v2 frontend already reference-free since 3.5b; no other consumers in api-v2 — see §"Reconciles" below).

## Explicitly out of slice

- **`apps/api/` workspace (entire)** — frozen. `apps/api/src/admin/auth/admin-auth.controller.ts` (parallel legacy controller in the legacy v1 backend NestJS app), `apps/api/src/admin/admin.module.ts`, `apps/api/test/admin-auth-lifecycle.e2e-spec.ts` (and similar parallel e2e specs), `apps/api/src/swagger-cookie-auth.ts`, `apps/api/src/swagger-cookie-auth.spec.ts`, `apps/api/README.md` — all retained. The legacy v1 stack (`apps/api/` + `apps/admin/`) is currently production-deployed and will be retired in a separate track after admin-v2 cutover (deploy of `apps/api-v2/` + `apps/admin-v2/`). Risk 13 mitigation track applies only to `apps/api-v2/`.
- **`apps/admin/` workspace (entire)** — frozen. Legacy v1 admin frontend deploys with `apps/api/`.
- **`apps/admin-v2/` workspace (entire)** — frozen. Frontend reference-free for `/api/admin/auth/*` since 3.5b (see `docs/admin-v2-mvp-3.5b-frontend-url-migration.md`).
- **`apps/api-v2/src/admin/auth/admin-auth.module.ts`** — frozen. Provides `AdminAuthService` to admin-v2 (consumed by `apps/api-v2/src/admin-v2/admin-v2.module.ts:26` and `apps/api-v2/src/admin-v2/admins/admin-v2-admins.module.ts:11`).
- **`apps/api-v2/src/admin/auth/admin-auth.service.ts` and its spec** — frozen. Shared service hardened in 3.5a; consumed by `AdminV2AuthController` (`apps/api-v2/src/admin-v2/auth/admin-v2-auth.controller.ts:9,58`).
- **`apps/api-v2/src/admin-v2/auth/admin-v2-auth.controller.ts`** — frozen. Target controller; provides `login`, `refresh-access`, `logout`, `me`, `revoke-session`, `invitations/accept`, `password/reset` endpoints under `@Controller('admin-v2/auth')`.
- **`apps/api-v2/src/auth/jwt.strategy.ts`** — frozen. Uses `isAdminApiPath()` (tolerant to both prefixes via `ADMIN_API_PATH_PREFIXES = ['/api/admin/', '/api/admin-v2/']` in `packages/api-types/src/http/admin-path.ts:1-9`).
- **`apps/api-v2/src/auth/jwt.guard.ts`, `auth.guard.ts`, `jwt-auth.module.ts`, `auth.module.ts`** — frozen.
- **`apps/api-v2/src/common/interceptors/consumer-action.interceptor.ts`** — frozen. Uses local `CONSUMER_API_PATH_PREFIX = '/api/consumer'` (lines 18-23); admin paths bail out independent of namespace.
- **`packages/api-types/`** including `admin-path.ts` — frozen.
- **`packages/database-2/prisma/schema.prisma`, `packages/database-2/prisma/migrations/`** — frozen. No schema change.
- **`apps/api-v2/src/dtos/admin/credentials.dto.ts`, `apps/api-v2/src/dtos/admin/index.ts`, `apps/api-v2/src/dtos/index.ts`** — frozen. `Credentials` DTO and `ADMIN.Access` namespace consumed by `AdminV2AuthController`.
- **`apps/api-v2/src/shared-common/` cookie helpers** — frozen. Shared between (deleted) legacy and admin-v2 controllers.
- **`apps/api-v2/src/shared/origin-resolver.service.ts`, `auth-audit.module.ts`, `database.module.ts`, `admin-action-audit.service.ts`** — frozen.
- **`apps/api-v2/src/configure-app.ts`, `main.ts`, `app.module.ts`** — frozen.
- **`SWAGGER_PROTECTED_PATH_PREFIXES_BY_AUDIENCE.admin = ['/api/admin/']`** in `apps/api-v2/src/swagger-cookie-auth.ts:21` — **retained**. Runtime CSRF auto-mirror prefix matcher used by Swagger UI fetch interceptor (`buildSwaggerCookieAuthScript`); covers v1 admin routes that remain in api-v2 backend (`/api/admin/admins`, `/api/admin/consumers`, `/api/admin/payment-requests`, `/api/admin/exchange`). Extension to `/api/admin-v2/` is a pre-existing dev-UX gap, scope of a separate slice (or 3.5d Swagger cleanup).
- **`apps/api-v2/src/swagger-cookie-auth.spec.ts:53`** assertion `expect(script).toContain('/api/admin/')` — retained (asserts on the runtime prefix matcher line 21, which is itself retained).
- **`apps/api-v2/test/utils/**`** e2e helpers — frozen (namespace-agnostic).
- **`apps/api-v2/test/consumer-*.e2e-spec.ts`** — frozen.
- **`apps/api-v2/src/admin-v2/**/*.spec.ts`** — frozen.
- **`apps/api-v2/src/auth/auth.guard.spec.ts:103,378,401,425,453,482`** — `path: '/api/admin/consumers'` fixtures retained (admin v1 routes for testing guard on v1 surface).
- **All other `apps/api-v2/src/admin/modules/**`** modules — frozen (admin-v2 shares them).
- **Documentation**: `docs/PROJECT_DOCUMENTATION.md`, `docs/FEATURES_CURRENT.md`, `docs/SWAGGER_COOKIE_AUTH_USAGE.md`, `apps/api/README.md`, `CHANGELOG.md` — frozen. Pre-existing references to `/api/admin/auth/*` describe either the legacy v1 stack (`apps/api/`) or historical state of admin-v2 backend; their cleanup is a separate doc-cleanup slice (or part of `apps/api/` retirement track).
- **`admin-v2-pack/*`** — frozen. Single channel of state recording is this reconciliation note.
- **3.5a / 3.5b reconciliation note tokens** in `scripts/admin-v2-gates/config.mjs` — frozen. Tokens like `legacy AdminAuthController retained (slice 3.5c)` reflect historical state at the time of those slices' landing; not retroactively edited (Decision: historical reconciliation tokens immutable). 3.5c adds its own block; existing blocks unchanged.
- **Slice 3.5d** (session UI/observability — list-own-sessions, cross-admin revoke, `revoke_reason` enum, `refresh_reuse` alert wiring) — separate, post-3.5c.
- **Cosmetic admin-v2 frontend gaps** (`/api/me`, `/logout` BFF/route under non-`/api/admin-v2/` namespace) — out of scope; documented in 3.5b §17.4 as known follow-up.

## Decision: production helpers tolerant via `isAdminApiPath` — fixture migration safe

- `apps/api-v2/src/auth/jwt.strategy.ts:25` uses `isAdminApiPath(path)` from `packages/api-types/src/http/admin-path.ts:3-5` to decide whether to read admin cookie keys for the request. The helper is defined as `ADMIN_API_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))` over `['/api/admin/', '/api/admin-v2/']` (line 1). Both namespaces are recognised as admin paths.
- `apps/api-v2/src/common/interceptors/consumer-action.interceptor.ts:18-23` uses local `CONSUMER_API_PATH_PREFIX = '/api/consumer'` and `isConsumerApiPath`. Admin paths (any namespace) hit the `!isConsumerApiPath(request.path)` branch on line 42 and return `next.handle()` without recording.
- Implication: migrating fixture paths in `jwt.strategy.spec.ts:93` and `consumer-action.interceptor.spec.ts:127` from `/api/admin/auth/*` to `/api/admin-v2/auth/*` does not change production behavior under test; assertions hold identically. Fixture migration is safe and post-3.5c-realistic (admin-v2 backend now serves these endpoints; legacy `/api/admin/auth/*` returns 404).
- Alternatives considered:
  - **Switch fixtures to another existing admin v1 endpoint** (e.g., `/api/admin/consumers` per `auth.guard.spec.ts:103,378,401,425,453,482`): valid if production helpers were `/api/admin/`-only; not chosen because helpers are already tolerant.
  - **Rewrite tests to use `isAdminApiPath` directly via mock injection**: out of scope; tests are integration-style fixtures asserting on guard/interceptor behavior, not unit tests of the predicate.
  - **Migrate fixtures (chosen)**: fixture paths now describe the post-3.5c reality; no production change.

## Decision: `SWAGGER_PROTECTED_PATH_PREFIXES_BY_AUDIENCE.admin` retained at `['/api/admin/']`

- `apps/api-v2/src/swagger-cookie-auth.ts:21` defines the runtime prefix matcher used by `buildSwaggerCookieAuthScript` to decide which paths require auto-mirroring of `x-csrf-token` from the readable admin CSRF cookie in Swagger UI fetch requests.
- After 3.5c, the v1 admin routes `/api/admin/admins`, `/api/admin/consumers`, `/api/admin/payment-requests`, `/api/admin/exchange` (and others) remain registered in api-v2 backend (frozen — they belong to admin v1 surface, not to the auth namespace this slice retires). The `[/api/admin/]` prefix matcher continues to cover those routes correctly.
- Adding `/api/admin-v2/` to the matcher would extend Swagger UI CSRF mirroring to admin-v2 routes (e.g., `POST /api/admin-v2/auth/refresh-access` would auto-mirror `x-csrf-token`). This is a desirable dev-UX improvement but:
  - Touches runtime Swagger UI behavior — broader blast radius than the deletion+substitution scope of 3.5c.
  - Requires updating `swagger-cookie-auth.spec.ts:53` (`expect(script).toContain('/api/admin/')`) to also accept `'/api/admin-v2/'` or assert on both — additional test churn.
  - Pre-existing condition: admin-v2 endpoints have always lived without Swagger CSRF auto-mirror; this slice does not introduce the gap.
- Decision: **retain** matcher as-is. Document the gap as known dev-UX limitation (developers testing admin-v2 mutation endpoints via Swagger UI must manually add `x-csrf-token` header). Resolution belongs to a separate slice (e.g., 3.5d Swagger cleanup, or a dedicated dev-UX slice).

## Decision: `controllers` field removed entirely (not emptied to `[]`)

- After unregistering `AdminAuthController`, `AdminModule` (`apps/api-v2/src/admin/admin.module.ts`) has no top-level controllers — its function reduces to aggregation of feature submodules (`imports` array).
- Two equivalent NestJS shapes available:
  - `controllers: []` — explicit empty array.
  - Field removed entirely.
- Both are accepted by `@Module()` decorator; both produce identical runtime behavior.
- Decision: **remove field entirely**. Rationale: cleaner diff (one less line), no dangling syntax, signals semantic intent ("this module provides no controllers" rather than "this module currently provides zero controllers, list might grow"). Reversal cost identical for both shapes if a future controller is added.

## Decision: no shim routes for legacy `/api/admin/auth/*` in api-v2

- Pre-slice: api-v2 backend serves `/api/admin/auth/*` via deleted `AdminAuthController`.
- Post-slice: api-v2 backend returns 404 for `POST /api/admin/auth/{login,refresh-access,logout}` and `GET /api/admin/auth/me`. Intentional.
- Alternatives:
  - **308-redirect shim** (e.g., a thin controller forwarding `/api/admin/auth/login` → `/api/admin-v2/auth/login`): adds new code surface that requires its own deletion later; contradicts 3.5a §17.5 "small, reviewable, isolated rollback" principle.
  - **Rewrite via NestJS middleware**: runtime cost; obscures actual route surface for grep audit; over-engineering for a one-time deprecation.
  - **Clean removal (chosen)**: zero runtime overhead, minimum diff, clean semantic boundary.
- Safety justification:
  - Admin-v2 frontend already reference-free since 3.5b (`docs/admin-v2-mvp-3.5b-frontend-url-migration.md`); no admin-v2 caller will hit deleted routes.
  - Legacy admin frontend (`apps/admin/`) calls **its own** backend (`apps/api/` workspace, separate NestJS app); does not call api-v2.
  - No third-party integration consumes admin auth endpoints (admin auth is internal SPA).
  - api-v2 backend test suite exercises new admin-v2 endpoints, validating contract preservation.

## Decision: `AdminAuthService` kept as shared admin-v2 dependency

- Pre-slice misconception risk: `AdminAuthService` is "the legacy admin auth service" and could be deleted alongside the controller.
- Reality (verified via direct inspection):
  - `apps/api-v2/src/admin-v2/auth/admin-v2-auth.controller.ts:9` imports `import { AdminAuthService } from '../../admin/auth/admin-auth.service';`
  - `apps/api-v2/src/admin-v2/auth/admin-v2-auth.controller.ts:58` injects `private readonly service: AdminAuthService` in the constructor.
  - `apps/api-v2/src/admin-v2/admin-v2.module.ts:6,26` and `apps/api-v2/src/admin-v2/admins/admin-v2-admins.module.ts:4,11` import `AdminAuthModule` to obtain `AdminAuthService` via DI.
- After 3.5a hardening, `AdminAuthService` is the single canonical session-only admin auth service; both legacy `AdminAuthController` (deleted in 3.5c) and `AdminV2AuthController` (kept) delegate `login`, `refreshAccess`, `revokeSessionByRefreshTokenAndAudit` to it.
- Decision: **retain** `AdminAuthService` and `AdminAuthModule` unchanged. Their files live under `apps/api-v2/src/admin/auth/` for historical reasons (predate admin-v2 namespace); folder location is cosmetic and not migrated in this slice (would expand blast radius without functional benefit).

## Clerical correction: historical reconciliation tokens immutable

- `scripts/admin-v2-gates/config.mjs` blocks for `'docs/admin-v2-mvp-3.5a-admin-auth-hardening-plaintext-retirement.md'` (line ~409) and `'docs/admin-v2-mvp-3.5b-frontend-url-migration.md'` (line ~440) contain token `` `legacy AdminAuthController retained (slice 3.5c)` ``.
- After 3.5c lands, this token semantically becomes outdated (controller is no longer "retained" — it is removed).
- Decision: **do not edit** existing 3.5a / 3.5b config blocks. Rationale:
  - 3.5a / 3.5b reconciliation notes describe what those slices **did not do**; the "retained (slice 3.5c)" wording was accurate at their landing time.
  - Retroactively editing landed config tokens to reflect future state is misleading: the gate's purpose is to verify that documented decisions are present, not to mutate them across slices.
  - 3.5c's own RECONCILIATION_NOTES block records the new state explicitly; downstream readers can follow the chronology.
- Result: gate continues to pass (token still present in 3.5a / 3.5b notes by virtue of those notes being immutable). 3.5c adds its own block; no conflict.

## Reconciles

- Risk 13 (pack §08 lines 680-693) — promotes mitigation track: backend hardening (3.5a) landed, frontend URL migration (3.5b) landed, legacy controller retirement in api-v2 (3.5c — this slice) landed. Pack §03 line 217 (legacy retirement) — closed for `apps/api-v2/` workspace; `apps/api/` workspace closure is a separate retirement track.
- pack §03 line 312 ("If remaining auth hardening leaves legacy-only sensitive paths or inconsistent session validation, admin lifecycle remains limited to read-only admin list") — for api-v2: closed. Admin-v2 backend now serves admin auth exclusively through `AdminV2AuthController` (`/api/admin-v2/auth/*`), all session-backed via 3.5a hardening, all CSRF-checked, all audit-logged. Risk 13 hard gate (pack §08 line 688) — for api-v2: closed.
- Test baseline before 3.5c (record `yarn test:admin-v2 2>&1 | tail -5` and `yarn workspace @remoola/api-v2 test 2>&1 | tail -5` before this slice's landing). After 3.5c: api-v2 unit suite count down by 1 (`admin-auth.controller.spec.ts` deleted), test count down by 5 (its 5 tests). Other suites unchanged.
- E2E baseline before 3.5c: `yarn workspace @remoola/api-v2 test:e2e` count. After 3.5c: same suite count (3 affected suites — `admin-auth-lifecycle`, `admin-step-up`, `admin-payment-reversal` — pass via `/api/admin-v2/auth/*`); same test count.
- Backend `/api/admin/auth/{login,refresh-access,logout,me}` endpoints in api-v2 → 404 after deploy. Other `/api/admin/*` v1 routes (admins, consumers, payment-requests, exchange, audit, dashboard, ledger) — unchanged, remain registered via their respective submodules of `AdminModule`.
- `AdminAuthService` — unchanged. `AdminAuthModule` — unchanged. `AdminV2AuthController` — unchanged. Cookie keys, CSRF flow, request bodies, response shapes — unchanged. Active admin sessions (after 3.5a, all session-backed) continue to work without re-login: cookies remain valid, refresh via `/api/admin-v2/auth/refresh-access` works.
- Anomaly cluster, assignment cluster, saved-views skeleton, alerts skeleton, verification workspace expansion, audit explorer UI — all untouched.
- Consumer auth path — completely untouched.
- `apps/api/` workspace (legacy v1 backend) — untouched. Currently production-deployed; serves legacy frontend (`apps/admin/`). Risk 13 mitigation does not extend to this workspace; its retirement awaits cutover from `apps/api/+apps/admin/` to `apps/api-v2/+apps/admin-v2/`.

## Known dev-UX limitation

- After 3.5c, Swagger UI for the api-v2 admin audience (mounted at the admin Swagger docs URL — see `apps/api-v2/src/configure-app.ts` for exact mount path) advertises `POST /api/admin-v2/auth/refresh-access` as requiring CSRF parity (`buildSwaggerCookieAuthDescription` line 61). However, the runtime fetch interceptor (`buildSwaggerCookieAuthScript`) auto-mirrors `x-csrf-token` only for paths matching `SWAGGER_PROTECTED_PATH_PREFIXES_BY_AUDIENCE.admin = ['/api/admin/']` (line 21). Since `/api/admin-v2/auth/refresh-access` does not start with `/api/admin/`, Swagger UI does not auto-add the CSRF header.
- Practical impact: developer using Swagger UI to test `POST /api/admin-v2/auth/refresh-access` must manually add `x-csrf-token` header (with the value from the readable admin CSRF cookie). This was already true for all `/api/admin-v2/*` mutation endpoints prior to 3.5c (admin-v2 namespace has always lacked Swagger UI auto-mirror); 3.5c does not introduce the gap, but moving the description literals to `/api/admin-v2/auth/*` makes the pre-existing gap more visible.
- Resolution: extend `SWAGGER_PROTECTED_PATH_PREFIXES_BY_AUDIENCE.admin` to include `/api/admin-v2/` in a future slice (e.g., bundled with 3.5d Swagger cleanup, or as a dedicated dev-UX slice). Out of scope for 3.5c by §1.12 / §7.6 step 2.

## Pre-existing test gap not closed by this slice

- The 5 deleted controller spec test cases covered: cookie setting on login, cookie clearing + revoke on logout, CSRF rejection on logout without matching token, CSRF origin rejection on refresh-access with invalid origin, CSRF referer fallback on refresh-access. Equivalent coverage for `AdminV2AuthController` lives in:
  - `apps/api-v2/src/admin-v2/auth/admin-v2-auth.controller.spec.ts` (controller-level unit tests for admin-v2 controller).
  - `apps/api-v2/test/admin-auth-lifecycle.e2e-spec.ts` (now hitting `/api/admin-v2/auth/*` after migration).
- No new tests are written by 3.5c. Pre-existing test gaps for new admin-v2-specific behavior (e.g., no integration test for `Decision: production helpers tolerant` covering `isAdminApiPath` for both prefixes through full request stack) — documented as known limitation; reasonable trade-off for a deletion + URL substitution slice.
