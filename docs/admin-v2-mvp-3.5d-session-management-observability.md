# MVP-3.5d Admin Auth Hardening — Session Management Observability + Cross-Admin Revoke + `invalidated_reason` CHECK + `auth_refresh_reuse` Alert Workspace

> Status: landed | Phase: post-MVP-3 (Risk 13 mitigation step 4 of 4 — final) | Builds on: 3.5a backend hardening (`AdminAuthSessionModel`-only auth path), 3.5b admin-v2 frontend URL migration (`/api/admin-v2/auth/*`), 3.5c legacy `AdminAuthController` retirement in api-v2, pack §03 lines 196-217, pack §08 Risk 13 lines 680-693.

> Slice anchors (gate tokens, do not edit casing): MVP-3.5d, Risk 13, session-management observability, cross-admin revoke, invalidated_reason CHECK constraint, auth_refresh_reuse alert workspace, ADMIN_AUTH_SESSION_REVOKE_REASONS, admin_auth_session_invalidated_reason_check, admin_session_revoke_other, AdminV2AdminSessionsService, AuthRefreshReuseAlertEvaluator, GET /api/admin-v2/auth/me/sessions, GET /api/admin-v2/admins/:id/sessions, POST /api/admin-v2/admins/:id/sessions/:sessionId/revoke, 403 Forbidden cross-actor guard, dual audit (logout + admin_session_revoke_other), 30-day retention cap, windowMinutes, count_gt, Decision: CHECK constraint over Postgres ENUM, Decision: cross-admin endpoint in AdminV2AdminsController, Decision: 403 deprecation over silent removal, Decision: AuthSessionModel.invalidatedReason consumer column untouched, Decision: separate evaluator file per workspace preserved, Decision: shared admin-auth-session-reasons.ts const, apps/api/ workspace frozen, apps/admin/ workspace frozen, apps/api-v2/src/consumer/ frozen, Risk 13 mitigation track closed, schema.prisma whitespace drift reverted, pre-existing \_prisma_migrations drift on 20260420163000 and 20260420191500.

## Scope landed

### Database (additive, schema.prisma untouched)

- `packages/database-2/prisma/migrations/20260421110000_admin_auth_session_invalidated_reason_check/migration.sql` — adds `CHECK (invalidated_reason IS NULL OR invalidated_reason IN ('rotated','manual_revoke','cross_admin_revoked','logout','refresh_reuse_detected','password_reset','admin_deactivated'))` constraint named `admin_auth_session_invalidated_reason_check` on `admin_auth_sessions`. Idempotent backfill `UPDATE` collapses any non-canonical legacy literal to `manual_revoke` before applying the constraint.
- `packages/database-2/prisma/migrations/20260421110500_admin_v2_auth_refresh_reuse_workspace/migration.sql` — extends `saved_view_workspace_check` and `operational_alert_workspace_check` allowlists to include `'auth_refresh_reuse'` (additive, follows the landed 3.4a pattern: drop + recreate CHECK with extended IN-list, no data backfill needed because no rows yet for that workspace).
- Both migrations carry README files documenting CHECK-vs-ENUM rationale, backfill strategy, application impact, rollback (drop the constraint), and release checks.
- `packages/database-2/prisma/schema.prisma` — **untouched** (no `@@check`, no model edits). Prisma 5.x has no stable `@@check` attribute; CHECK lives in raw SQL only, matching the landed pattern from 3.3a / 3.3b / 3.4a.

### Backend (api-v2 — additive)

- `apps/api-v2/src/admin/auth/admin-auth-session-reasons.ts` — **new** shared TypeScript const `ADMIN_AUTH_SESSION_REVOKE_REASONS` and exported type `AdminAuthSessionRevokeReason`. Single source of truth for the seven canonical literals; replaces hard-coded strings at all writers of `invalidatedReason` on `AdminAuthSessionModel` (admin path).
- `apps/api-v2/src/admin/auth/admin-auth.service.ts` — extended:
  - All writers of `invalidatedReason` migrated to `ADMIN_AUTH_SESSION_REVOKE_REASONS.{rotated,manual_revoke,logout,refresh_reuse_detected,password_reset}`. No string literals remain on the admin path.
  - New public `assertSessionBelongsToAdmin(adminId, sessionId)` — used by self-revoke guard before delegating to `revokeSessionByIdAndAudit`.
  - New public `listSessionsForAdmin(adminId)` — returns `AdminAuthSessionView[]` sorted by `createdAt` desc with a hard 30-day retention cap (`createdAt >= now - 30d`).
  - New `AdminLoginContext.sessionFamilyId` plumbed through login response so the shell can mark the current session in `/me/sessions`.
- `apps/api-v2/src/admin-v2/admins/admin-v2-admins.service.ts` — `invalidatedReason` writers in admin deactivation cascade and password-reset cascade migrated to `ADMIN_AUTH_SESSION_REVOKE_REASONS.admin_deactivated` and `ADMIN_AUTH_SESSION_REVOKE_REASONS.password_reset` respectively.
- `apps/api-v2/src/admin-v2/admins/admin-v2-admin-sessions.service.ts` — **new** `AdminV2AdminSessionsService`. Two methods:
  - `listSessionsForAdmin(adminId)` — verifies admin exists (404 → `ADMIN_NO_IDENTITY_RECORD` BadRequest), delegates to `AdminAuthService.listSessionsForAdmin`.
  - `revokeSessionAsManager(targetAdminId, sessionId, actorAdminId, ctx)` — self-target rejected with 400 (Decision: 400 not 403 — explicit error code "use the self endpoint instead"); session existence verified; delegates to `AdminAuthService.revokeSessionByIdAndAudit` with `reason = ADMIN_AUTH_SESSION_REVOKE_REASONS.cross_admin_revoked`; records the dual audit (logout + admin_session_revoke_other) with `targetAdminId` and `alreadyRevoked` in metadata.
- `apps/api-v2/src/admin-v2/admins/admin-v2-admins.module.ts` — wires `AdminV2AdminSessionsService` into providers.
- `apps/api-v2/src/admin-v2/admins/admin-v2-admins.controller.ts` — adds two endpoints (`admins.read` + `admins.manage` capability-gated):
  - `GET :id/sessions` (`@Capabilities('admins.read')`) — delegates to `AdminV2AdminSessionsService.listSessionsForAdmin`.
  - `POST :id/sessions/:sessionId/revoke` (`@Capabilities('admins.manage')`) — self-target check, then delegates to `revokeSessionAsManager`.
- `apps/api-v2/src/admin-v2/auth/admin-v2-auth.controller.ts` — extended:
  - `revokeSession` now adds the **403 Forbidden cross-actor guard**: if `body.sessionId` resolves to a session whose `adminId !== currentAdmin.id`, the controller throws `ForbiddenException` (Decision: 403 deprecation over silent removal — DTO shape preserved, behavior tightened, error code distinguishable for clients).
  - New `GET me/sessions` (`@Capabilities('me.read')`) — returns `{ sessions: AdminAuthSessionView[] }` with the `current` session marked via `currentAdmin.sessionId` match.
- `apps/api-v2/src/shared/admin-action-audit.service.ts` — adds `admin_session_revoke_other` to `ADMIN_ACTION_AUDIT_ACTIONS` const. (No new `AUTH_AUDIT_EVENTS` — `logout` is reused for the cross-admin revoke audit half.)

### Operational alerts evaluator (additive)

- `apps/api-v2/src/admin-v2/operational-alerts/admin-v2-operational-alerts-workspace-evaluators-auth-refresh-reuse.ts` — **new** `AuthRefreshReuseAlertEvaluator`. Counts `AuthAuditLogModel` rows with `identityType = 'admin'` and `event = AUTH_AUDIT_EVENTS.refresh_reuse` over `windowMinutes`-window; fires when `count > threshold.value` for `count_gt` thresholds.
- `apps/api-v2/src/admin-v2/operational-alerts/admin-v2-operational-alerts.dto.ts` — extends `OPERATIONAL_ALERT_WORKSPACES` const with `'auth_refresh_reuse'` (third entry; preserves the immutable-on-update workspace contract from 3.3b).
- `apps/api-v2/src/admin-v2/operational-alerts/admin-v2-operational-alerts-evaluator.service.ts` — registers `AuthRefreshReuseAlertEvaluator` in the evaluator strategy table.
- `apps/api-v2/src/admin-v2/operational-alerts/admin-v2-operational-alerts.module.ts` — adds the new evaluator to providers.

### Frontend (admin-v2 — additive)

- `apps/admin-v2/src/lib/admin-api.server.ts` — adds `AdminSessionInvalidatedReason`, `AdminSessionView`, `ListAdminSessionsResponse` types and BFF helpers `getMyAdminSessions()` and `getAdminSessions(adminId)`. Extends `OperationalAlertWorkspace` union with `'auth_refresh_reuse'`.
- `apps/admin-v2/src/lib/admin-mutations.server.ts` — adds server actions `revokeMyAdminSessionAction(formData)` and `revokeAdminSessionAction(adminId, sessionId, formData)`. No new BFF route handlers under `apps/admin-v2/src/app/api/`.
- `apps/admin-v2/src/app/(shell)/me/sessions/page.tsx` — **new** `/me/sessions` page. Lists current admin's sessions (active and recently revoked, capped at 30 days), shows the "Current" pill on the session matching the access cookie, exposes a per-row "Revoke this session" form that posts to `revokeMyAdminSessionAction`. Hides the form on the current session and on already-revoked rows.
- `apps/admin-v2/src/app/(shell)/me/sessions/page.test.tsx` — **new** unit tests cover the three render branches (active+current+revoked mix, empty state, BFF-unavailable banner) and the form-visibility invariants.
- `apps/admin-v2/src/app/(shell)/admins/[adminId]/page.tsx` — adds the **Active sessions** section under `canReadSessions` gating (admin reading another admin's sessions requires `admins.read`). Cross-admin revoke buttons rendered only when `canManage && !s.revokedAt && !isSelf`; on self view, shows "Use My sessions for self-revoke" pointer to `/me/sessions`.
- `apps/admin-v2/src/app/(shell)/admins/[adminId]/page.test.tsx` — extended with three new assertions/tests: cross-admin happy path, self-target hidden + banner, capability-less admin sees no sessions section.
- `apps/admin-v2/src/app/(shell)/system/alerts/page.tsx` — extended to render two workspace sections (`ledger_anomalies` + `auth_refresh_reuse`). Reuses the existing `createOperationalAlertAction` / `updateOperationalAlertAction` / `deleteOperationalAlertAction` server actions; no new actions. Each workspace section has its own create-form variant (ledger anomalies uses `class` query payload; auth refresh reuse uses `windowMinutes` query payload). `verification_queue` workspace stays out of this page (unchanged from 3.4a — currently surfaced elsewhere).
- `apps/admin-v2/src/app/(shell)/system/alerts/page.test.tsx` — extended with assertions for both workspace sections and a dedicated `auth_refresh_reuse` test that asserts the windowMinutes payload summary renders as `Window: 30m`.
- `apps/admin-v2/src/app/(shell)/layout.tsx` — adds a single `My sessions` Link inside the existing identity panel (only rendered when an identity is present). The shell uses hard-coded nav entries; this is the minimal addition specified in §4.5 of the handoff.

### Fixtures

- `packages/db-fixtures/src/admin-v2-scenarios.ts` — replaced fixture literal `'fixture_force_logout_after_risk_review'` with the canonical `'admin_deactivated'` so the new CHECK constraint accepts the seeded session row.

### Gate config

- `scripts/admin-v2-gates/config.mjs` — adds:
  - `CHECK_PATHS`: `apps/api-v2/src/admin/auth/admin-auth-session-reasons.ts`, the two new migration READMEs, this reconciliation note doc.
  - `AUDIT_ACTIONS`: `admin_session_revoke_other`.
  - `FRONTEND_ACTIONS`: `revokeMyAdminSessionAction`, `revokeAdminSessionAction`.
  - `ROUTE_TOKENS` for `admin-v2-admins.controller.ts`: `@Get(\`:id/sessions\`)`, `@Post(\`:id/sessions/:sessionId/revoke\`)`. New `ROUTE_TOKENS`entry for`admin-v2-auth.controller.ts`: `@Post(\`revoke-session\`)`, `@Get(\`me/sessions\`)`.
  - `AFFECTED_PATHS`: `docs/admin-v2-mvp-3.5d-session-management-observability.md`, `apps/api-v2/src/admin/auth/admin-auth-session-reasons.ts`.
  - `RECONCILIATION_NOTES['docs/admin-v2-mvp-3.5d-session-management-observability.md']`: anchors token list (this file is the single channel of state recording for slice 3.5d).

## Explicitly out of slice (frozen surfaces)

- **`apps/api/` workspace (entire)** — frozen. Legacy v1 backend; Risk 13 mitigation does not extend to it. Its retirement awaits cutover from `apps/api/+apps/admin/` to `apps/api-v2/+apps/admin-v2/`.
- **`apps/admin/` workspace (entire)** — frozen. Legacy v1 admin frontend.
- **`apps/api-v2/src/consumer/` (entire)** — frozen. Consumer auth path completely untouched. `AuthSessionModel.invalidatedReason` consumer column — **not migrated** to a typed allowlist in this slice (Decision: AuthSessionModel.invalidatedReason consumer column untouched — separate consumer-side track).
- **`apps/api-v2/src/auth/jwt.strategy.ts`, `apps/api-v2/src/auth/jwt.guard.ts`, `apps/api-v2/src/guards/auth.guard.ts`** — frozen. Authentication and authorization rails unchanged; capabilities `me.read`, `admins.read`, `admins.manage` already exist.
- **`apps/api-v2/src/shared-common/csrf-protection.ts`** — frozen. CSRF flow unchanged.
- **`apps/api-v2/src/shared/origin-resolver.service.ts`** — frozen. Cross-origin posture unchanged.
- **`AUTH_AUDIT_EVENTS` (entire)** — frozen. The cross-admin revoke audit trail reuses `AUTH_AUDIT_EVENTS.logout` (admin path) and adds the manager identity through `ADMIN_ACTION_AUDIT_ACTIONS.admin_session_revoke_other` only. No new auth events.
- **`LedgerAnomaliesAlertEvaluator`, `VerificationQueueAlertEvaluator`** — frozen. The new `AuthRefreshReuseAlertEvaluator` is a separate file per workspace (Decision: separate evaluator file per workspace preserved — no shared base class, no polymorphic payload schema).
- **`packages/database-2/prisma/schema.prisma`** — frozen (Decision: CHECK constraint over Postgres ENUM — Prisma 5.x has no stable `@@check`; the constraint lives in raw SQL only, identical to landed 3.3a / 3.3b / 3.4a pattern).
- **`packages/api-types/`** — frozen.
- **`admin-v2-pack/*`** — frozen.
- **3.5a / 3.5b / 3.5c reconciliation note tokens** in `scripts/admin-v2-gates/config.mjs` — frozen (historical reconciliation tokens immutable; tokens like `session observability deferred (slice 3.5d)` accurately described 3.5a's landing-time state and stay as historical record).

## Decision: CHECK constraint over Postgres ENUM

- Source: `.cursor/skills/migration-safety/SKILL.md:8`. CHECK constraints evolve and roll back additively with simple `ALTER TABLE ... DROP CONSTRAINT` + `ALTER TABLE ... ADD CONSTRAINT`; Postgres `ENUM` types require `ALTER TYPE ... ADD VALUE` (no removal) and `CREATE TYPE` ordering coupled with model deployment.
- The existing `saved_view_workspace_check` and `operational_alert_workspace_check` constraints (landed in 3.3a / 3.3b / 3.4a) follow the same pattern; introducing the first ENUM in this domain would split the convention.
- Prisma 5.x has no stable `@@check` declarative attribute, so `schema.prisma` cannot represent CHECK constraints anyway; both ENUM and CHECK approaches require raw SQL migrations. CHECK is chosen for symmetry with the landed pattern.

## Decision: cross-admin revoke endpoint in `AdminV2AdminsController`

- Pre-slice option A: extend `AdminV2AuthController.revokeSession` to accept arbitrary `sessionId` from any actor.
- Chosen option B: add `POST :id/sessions/:sessionId/revoke` to `AdminV2AdminsController` under `@Capabilities('admins.manage')`.
- Rationale: `AdminV2AuthController` semantics are "current actor's own auth surface" (login, logout, refresh, revoke own session, list own sessions). Cross-admin revoke is a manager action belonging to admin lifecycle, sitting next to deactivate / restore / role-change / permissions-change / password-reset (`AdminV2AdminsController`).
- Audit shape consequence (intended): cross-admin revoke records both `AUTH_AUDIT_EVENTS.logout` (target identity, via `AdminAuthService.revokeSessionByIdAndAudit`) **and** `ADMIN_ACTION_AUDIT_ACTIONS.admin_session_revoke_other` (manager identity, with `targetAdminId` in metadata). Self revoke continues to be an `AdminV2AuthController.revokeSession` call recording only `AUTH_AUDIT_EVENTS.logout` (no `ADMIN_ACTION_AUDIT_ACTIONS.admin_session_revoke` for self-revoke — same as the 3.5a-landed contract).
- Alternative considered: a sibling `AdminV2SessionsController` for both self and cross-admin endpoints. Rejected: would split the admin lifecycle audit trail across two controllers and require duplicating the capability gate.

## Decision: 403 deprecation over silent removal

- `AdminV2AuthController.revokeSession.body.sessionId` (added in 3.5a as part of the session-only auth path) previously accepted any `sessionId`. With the new cross-admin endpoint living in `AdminV2AdminsController`, the cross-actor branch of `revokeSession` becomes redundant and dangerous (it would bypass the `admins.manage` capability gate).
- Two options to retire the cross-actor branch:
  - **Silent removal**: drop the `sessionId` field from the DTO. Breaks any hypothetical client that passes `sessionId === currentSession.id` (legitimate self-revoke by id).
  - **403 Forbidden** when `sessionId` resolves to another admin's session, **200 OK** when it matches the current session or no sessionId is provided. Chosen.
- Rationale: preserves DTO shape (zero client-side breakage for legitimate self-revoke flows), produces an explicit error code that distinguishes "you tried to revoke another admin's session through the wrong endpoint", and keeps the audit shape uniform (self-revoke continues to be `AUTH_AUDIT_EVENTS.logout` only; cross-admin revoke now requires going through `AdminV2AdminsController` and earns the dual audit).

## Decision: `AuthSessionModel.invalidatedReason` consumer column untouched

- The consumer counterpart `AuthSessionModel.invalidatedReason` (`apps/api-v2/src/consumer/`) is a free-form text column today. A symmetric typed allowlist would be desirable, but:
  - Consumer auth path is out of scope for Risk 13 mitigation (pack §08 lines 680-693 — Risk 13 is admin-side).
  - Migrating consumer column requires a separate backfill, separate CHECK constraint, separate consumer-side const, separate test surface — broadens blast radius outside Risk 13.
- Decision: defer to a separate consumer-side hardening track (no `apps/api-v2/src/consumer/` change in this slice; gate config holds the path frozen).

## Decision: separate evaluator file per workspace preserved

- Each `OperationalAlertWorkspace` evaluator lives in its own file (`admin-v2-operational-alerts-workspace-evaluators-{ledger-anomalies,verification-queue,auth-refresh-reuse}.ts`). The shared `OperationalAlertsEvaluatorService` routes by workspace via an exhaustive strategy table.
- The evaluator query payload differs per workspace (`{ class, dateFrom, dateTo }` vs verification filters vs `{ windowMinutes }`); overloading would force a polymorphic payload schema that none of the three evaluators benefit from.
- Test isolation: each evaluator owns a focused spec; no shared fixture state.

## Decision: shared `admin-auth-session-reasons.ts` const

- Pre-slice: invalidation reasons were free-form strings written at four call sites (rotation, manual revoke, password reset, admin deactivate, refresh-reuse detection).
- Post-slice: a single `ADMIN_AUTH_SESSION_REVOKE_REASONS` const exports seven canonical literals as a `const` object + derived `AdminAuthSessionRevokeReason` union type. All admin-path writers import from this file.
- Test surface: `admin-auth.service.spec.ts` and `admin-v2-admins.service.spec.ts` assert that the reason propagated to the DB matches the const, not a string literal — drift between the const and call sites would surface immediately in unit tests, **before** the CHECK constraint rejects the write at runtime.

## Decision: 30-day retention cap on session listings

- `listSessionsForAdmin` filters `createdAt >= now - 30d`. Older revoked sessions remain in the table (no purge), but the API does not expose them.
- Rationale: bounds the response payload (an admin with high session churn over a year could otherwise pull thousands of revoked rows), aligns with typical observability windows for incident review (24h-30d), and keeps the response predictable for the `/me/sessions` UI.
- The cap is a single integer constant in `AdminAuthService`; raising or lowering it is a one-line change.

## Decision: `windowMinutes` not date range payload for `auth_refresh_reuse`

- The `auth_refresh_reuse` evaluator is a streaming-signal monitor: it must catch active refresh-token reuse attacks within minutes of detection, not historical aggregations over date ranges.
- Bounded range `[1..1440]` (1 minute to 24 hours) — short enough to catch live attacks, long enough to absorb retry storms.
- Combined with the existing `@Cron('*/5 * * * *')` evaluator tick (`admin-v2-operational-alerts-evaluator.service.ts:78`), threshold breaches are detected with at most a 5-minute lag.
- Date-range payload (mirroring `ledger_anomalies`) was rejected because date arithmetic on `AuthAuditLogModel.createdAt` would be slower than a single `gte: now - windowMinutes * 60_000` predicate, and because operators routinely re-tune the rolling window without thinking about absolute dates.

## Reconciles

- Risk 13 (pack §08 lines 680-693) — **closed**. The four-step mitigation track (3.5a backend hardening → 3.5b frontend URL migration → 3.5c legacy controller retirement → 3.5d session observability + cross-admin revoke + typed invalidation reasons + refresh-reuse alert) lands fully. The hard gate from pack §08 line 688 is dismissed for the api-v2 stack. Risk 13 mitigation track closed; no further Risk 13 sub-slices remain.
- Pack §03 lines 196-217 — admin auth surface in api-v2 is now: (a) session-only via `AdminAuthSessionModel`; (b) DB-enforced typed `invalidated_reason`; (c) self-service `/me/sessions` UI; (d) `admins.manage`-gated cross-admin revoke with dual audit; (e) operational alert evaluator for refresh-reuse with `count_gt` threshold over `windowMinutes`-window.
- Anomaly cluster, assignment cluster, saved-views skeleton (3.3a), alerts skeleton (3.3b), verification workspace expansion (3.4a), audit explorer UI — all untouched. The new `auth_refresh_reuse` workspace fits the same `OperationalAlertModel` schema as `ledger_anomalies` / `verification_queue`; the workspace allowlist expansion follows the landed 3.4a pattern.
- Cookie keys, CSRF flow, request bodies, response shapes — unchanged. Active admin sessions continue to work without re-login.
- Test deltas: backend 29 suites / 294 tests → 31 suites / 314 tests after 3.5d (new `admin-v2-admin-sessions.service.spec.ts` and `admin-v2-operational-alerts-workspace-evaluators-auth-refresh-reuse.spec.ts`; extended specs on `admin-auth.service.spec.ts`, `admin-v2-auth.controller.spec.ts`, `admin-v2-admins.controller.spec.ts`, `admin-v2-operational-alerts-evaluator.service.spec.ts`). Frontend 26 suites / 63 tests → 27 suites / 69 tests after 3.5d (new `/me/sessions/page.test.tsx`; extended `admins/[adminId]/page.test.tsx` and `system/alerts/page.test.tsx`).

## Discovered while exploring (escalations)

- **schema.prisma whitespace drift reverted**: `yarn prisma format` produced a non-empty diff in `packages/database-2/prisma/schema.prisma` (whitespace-only normalization on pre-existing models). The diff was not introduced by 3.5d work; reverted via `git checkout -- packages/database-2/prisma/schema.prisma` to honor the §1.2 hard rule (schema.prisma must be untouched). Root cause classified as **(a) regression from a prior slice**, not (b) Prisma CLI nondeterminism: the `prisma` package is pinned to `6.19.0` in both root `package.json` and `packages/database-2/package.json`, and the schema's last touch is commit `15526244` (`feat(admin-v2): add OperationalAlertModel + foundation migration`, 2026-04-21 08:03), which committed model edits without a follow-up `prisma format`. Cleanup belongs to a dedicated mini-slice ("`prisma format` baseline restore") that runs `prisma format`, commits only the whitespace diff, and adds a `prisma format --check` step to pre-commit / CI to prevent recurrence. Tracked under `admin-v2-handoff/README.md` → "Known follow-ups".
- **pre-existing \_prisma_migrations drift on 20260420163000 and 20260420191500**: `yarn prisma migrate dev` failed reporting that two prior migrations (`20260420163000_admin_v2_ledger_anomalies_indexes`, `20260420191500_admin_v2_duplicate_idempotency_risk_index`) were modified after being applied, blocking new migrations. This is pre-existing drift from a prior slice's hot-fix and is not introduced by 3.5d. Resolution chosen for this slice: apply the two new SQL files directly via `yarn prisma db execute --file ...`, then mark them as applied via `yarn prisma migrate resolve --applied 20260421110000_admin_auth_session_invalidated_reason_check` and `--applied 20260421110500_admin_v2_auth_refresh_reuse_workspace`. Avoided destructive `prisma migrate reset` to preserve seed data and other applied migrations. The pre-existing drift on the two earlier migrations remains and is documented here as discovered staleness; reconciling it requires a `prisma migrate resolve --applied` on those rows or a full reset on a non-shared DB, both of which are out of scope for 3.5d and belong to a dedicated migration-history-cleanup slice.
- No other §14 escalation triggers fired: no non-canonical literal in `admin_auth_sessions.invalidated_reason` outside the backfill set; no `revokeSessionByIdAndAudit` call outside the two sanctioned places (self-revoke, cross-admin revoke); no pre-existing `RevokeReason` enum or `revoke_reason` column; no failed prior `_prisma_migrations` row for the two new migrations after the manual apply + resolve; no frontend component already reading admin sessions outside the new files; `WorkspaceEvaluatorRegistry` remains exhaustive (three workspaces, three evaluators); `prisma generate` produces no new diff because `schema.prisma` is untouched; no consumer test required modification.

## Pre-existing test gap not closed by this slice

- No e2e coverage exercises the full `/me/sessions` → `revokeMyAdminSessionAction` → `AdminV2AuthController.revokeSession` → `AdminAuthService.revokeSessionByIdAndAudit` round trip. Unit-level coverage exists at every layer (service, controller, page); integration coverage is provided by the existing `admin-auth-lifecycle.e2e-spec.ts` for the underlying `revoke-session` endpoint. A dedicated e2e for the UI form roundtrip is a reasonable follow-up but not required for Risk 13 closure.
- No e2e coverage exercises `AuthRefreshReuseAlertEvaluator` end-to-end through the cron tick. Unit tests cover the evaluator in isolation (count, threshold firing, payload validation, window range); integration belongs to a broader operational-alerts e2e harness that does not exist for any workspace today.
