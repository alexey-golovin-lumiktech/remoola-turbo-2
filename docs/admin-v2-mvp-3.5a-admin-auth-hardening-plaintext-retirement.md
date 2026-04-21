# MVP-3.5a Admin Auth Hardening — Plaintext-fallback retirement + admin_session_revoke audit

> Status: landed | Phase: post-MVP-3 (Risk 13 mitigation step 1 of 4) | Builds on: hardened session baseline (`AdminAuthSessionModel`), pack §03 lines 196-217, §08 Risk 13 lines 680-693

> Slice anchors (gate tokens, do not edit casing): MVP-3.5a, Risk 13, auth hardening, plaintext fallback retirement, AdminAuthSessionModel, AccessRefreshTokenModel, getLegacyAccessAndRefreshToken removed, findIdentityAccess removed, admin_session_revoke audit, dual audit (logout + admin_session_revoke), no schema migration, no new capability, no new auth audit event, forced re-login for residual non-sid admin tokens, legacy AdminAuthController retained (slice 3.5c), frontend URL migration deferred (slice 3.5b), session observability deferred (slice 3.5d), Decision: sid mandatory on admin path, Decision: no enum revoke_reason in this slice, Decision: dual-audit not replacement, Decision: no capability gate on revoke-session.

## Scope landed

- `auth.guard.ts:processAccessToken` admin else-branch теперь **session-only**: `verified.sid` обязателен, plaintext-comparison fallback против `accessRefreshTokenModel` удалён вместе с private helper `findIdentityAccess` (lines 96-104 pre-slice).
- `AdminAuthService.refreshAccess` теперь **session-only**: `verified.sid` + `verified.identityId` + refresh-typ обязательны; legacy fallback против `accessRefreshTokenModel.findFirst` + plaintext `secureCompare(stored, plaintext)` + `getLegacyAccessAndRefreshToken` re-issuance удалён.
- `AdminAuthService.getLegacyAccessAndRefreshToken` private метод полностью удалён вместе с unused import `type AccessRefreshTokenModel`.
- `AdminAuthService.revokeSessionByRefreshToken` упрощён: убран outer try/catch fallback и `accessRefreshTokenModel.deleteMany` ветка для non-sid токенов; теперь либо session-targeted updateMany, либо silent no-op.
- `AdminV2AuthController.revokeSession` теперь пишет **dual audit**: existing `AUTH_AUDIT_EVENTS.logout` через `revokeSessionByIdAndAudit` + new `ADMIN_ACTION_AUDIT_ACTIONS.admin_session_revoke` через `AdminActionAuditService.record(...)` с metadata `{isOwnSession, alreadyRevoked}`.
- `ADMIN_ACTION_AUDIT_ACTIONS.admin_session_revoke` — единственная новая audit constant.

## Explicitly out of slice

- `AccessRefreshTokenModel` schema drop (table сохраняется для retention; отдельный cleanup slice).
- `accessRefreshTokenModel.deleteMany` calls в `admin-v2-admins.service.ts:777, 1482` (housekeeping; теперь удаляют unreachable rows, но это allowed transitional state).
- Legacy `AdminAuthController` (`/api/admin/auth/*`) controller retirement — slice 3.5c (после frontend URL migration).
- admin-v2 frontend URL migration с `/api/admin/auth/*` на `/api/admin-v2/auth/*` (`LoginForm.tsx`, `middleware.ts`, `accept-invite/page.tsx`, `reset-password/page.tsx`) — slice 3.5b.
- Cross-admin revoke endpoint (`POST /admins/:id/sessions/:sid/revoke` с `admins.manage` capability + confirmation flag) — slice 3.5d.
- `me/sessions` listing endpoint и UI — slice 3.5d.
- `revoke_reason` enum + UI explorer — slice 3.5d.
- `refresh_reuse` alert wiring в `/system/alerts` workspace — slice 3.5d (использует существующий 3.3b alert framework).
- Backfill audit log entries для historical revoke-session actions — append-only invariant запрещает.
- Изменения в consumer auth path (`auth.guard.ts:142-167`).
- Изменения в `JwtStrategy`, `JwtAuthGuard`, `OriginResolverService`, `csrf-protection.ts`, `auth-cookie-policy.ts`.
- Новые auth audit events в `AUTH_AUDIT_EVENTS`.
- Новые capabilities в `KNOWN_ADMIN_V2_CAPABILITIES`.
- Frontend UI для session management.
- Schema migrations / Prisma generate.

## Decision: sid mandatory on admin path (no fallback)

- pre-slice: admin path принимал любой valid JWT с `scope: 'admin'`; если `sid` отсутствовал — падал на plaintext compare против `accessRefreshTokenModel.accessToken`.
- post-slice: admin path **обязан** нести `sid`; non-sid токен → `401 INVALID_TOKEN`.
- Альтернативы:
  - **Soft deprecation** (warn + accept на N дней): затягивает window небезопасного code path; нет evidence, что residual non-sid токены массово существуют (login активен session-based достаточно давно).
  - **Forced rotation** (issue new sid-bearing token при non-sid request): требует extra DB write на read-path; противоречит pack §07 Risk 8 budget.
  - **Hard fail** (chosen): минимальная code surface, deterministic security boundary; UX impact = один admin re-login, тривиальный.
- pack §03 line 214 explicitly: "Довести все admin-v2 session validation paths до единого AdminAuthSessionModel contract без fallback drift" — этот выбор exact match.

## Decision: dual-audit not replacement

- Pre-slice: `revoke-session` пишет только `AUTH_AUDIT_EVENTS.logout` в `AuthAuditLogModel`.
- Post-slice: пишет **и** `logout` в `AuthAuditLogModel`, **и** `admin_session_revoke` в `AdminActionAuditLogModel`.
- Альтернативы:
  - **Replace**: убрать `logout` из revoke-session, оставить только admin action audit. Нарушает auth audit timeline continuity (logout events используются в anomaly detection, see pack §03 lines 387-395).
  - **Single log table**: пере-инжинирить `AuthAuditLogModel` и `AdminActionAuditLogModel` в общий — out of scope.
  - **Dual** (chosen): два audit имеют **разные цели**:
    - `AuthAuditLogModel.logout` — security/forensic per-identity timeline (correlation с login_success / refresh_reuse / login_failure).
    - `AdminActionAuditLogModel.admin_session_revoke` — privileged-action accountability (actor + target + metadata, обязательное для compliance review).
- pack §01 audit-first invariant: "каждая admin mutation должна автоматически попадать в единый admin action audit flow" — revoke-session = mutation, обязательно admin action audit. Существующий auth audit — security layer, не mutation log.

## Decision: no enum revoke_reason in this slice

- Existing `AdminAuthSessionModel.invalidatedReason` — text column, нет enum.
- Существующие values используемые в коде: `'rotated'`, `'refresh_reuse_detected'`, `'logout'`, `'manual_revoke'`, `'admin_deactivated'`. Все free-form strings.
- Альтернатива (enum `RevokeReason`): требует schema migration + Prisma generate + downstream filter UI, выходит за scope hardening cleanup.
- Текущее решение: invalidatedReason остаётся text; новый action `admin_session_revoke` пишет metadata `{isOwnSession, alreadyRevoked}` в admin action audit отдельно от invalidatedReason text. Slice 3.5d может ввести enum при необходимости.

## Decision: no capability gate on revoke-session

- Pre-slice: `@UseGuards(JwtAuthGuard)` без явного `assertCapability` call. Admin может revoke ровно те sessions, что принадлежат его identity (service:357 `where: { id: sessionId, adminId }`).
- Post-slice: то же.
- Альтернатива (`assertCapability(admin, 'admins.manage')`): требуется только если revoke-session расширяется на cross-admin scope (slice 3.5d). В текущем self-only контракте — overkill, и может даже сломать legitimate self-revoke flow для not-elevated admin'ов.
- Если в будущем slice 3.5d добавит body `targetAdminId` поле — capability check будет добавлен **в той правке**, не в этой.

## Decision: legacy AdminAuthController retained (slice 3.5c)

- Pre-slice: legacy controller registered в `admin.module.ts:28`; admin-v2 frontend бьёт по нему (LoginForm + middleware).
- Post-slice: legacy controller **остаётся registered**, но через shared service теперь hardened (no sid → throws везде).
- Обоснование staged retirement:
  - Шаг 1 (этот slice): backend hardening. Forced re-login для residual non-sid admin tokens; новых non-sid токенов больше не выдаётся.
  - Шаг 2 (slice 3.5b): frontend URL migration на `/api/admin-v2/auth/*`. После этого legacy controller становится unused.
  - Шаг 3 (slice 3.5c): drop legacy controller registration + delete file. Verify нет external consumers.
  - Шаг 4 (slice 3.5d): observability + cross-admin revoke + revoke_reason enum.
- Каждый шаг — small, reviewable, isolated rollback.

## Forced re-login for residual non-sid admin tokens

- Любой admin, который имеет non-sid access/refresh token — после deploy следующий же request → `401`/`400` → middleware redirect на `/login` → admin re-логинится → получает session-backed токены.
- Estimated impact в production: 0 admin'ов (session-based login активен давно; residual non-sid токенов скорее всего нет).
- Estimated impact в dev/staging: до handful re-login'ов; admin'ы знакомы с redirect-on-expired flow.
- Documented как expected behaviour, не bug.
- Никаких user-facing notification banners / migration emails — internal admin app, audience знает.

## Frontend URL migration deferred (slice 3.5b)

- `apps/admin-v2/src/features/auth/LoginForm.tsx:19` — `/api/admin/auth/login` остаётся.
- `apps/admin-v2/src/middleware.ts:12` — `REFRESH_PATH = /api/admin/auth/refresh` остаётся.
- `apps/admin-v2/src/app/(public)/accept-invite/page.tsx:16` — `/api/admin/auth/invitations/accept` остаётся.
- `apps/admin-v2/src/app/(public)/reset-password/page.tsx:16` — `/api/admin/auth/password/reset` остаётся.
- Все четыре правки = scope slice'а 3.5b.

## Session observability deferred (slice 3.5d)

- `GET /api/admin-v2/me/sessions` — list own active sessions.
- `POST /api/admin-v2/admins/:adminId/sessions/:sid/revoke` — cross-admin revoke с capability gate.
- `revoke_reason` enum + UI explorer.
- `refresh_reuse` alert wiring через 3.3b operational alert framework.
- "Active sessions" UI panels.

## Reconciles

- Risk 13 (pack §08 lines 680-693) частично закрыт: пункт §03 line 214 (unify session validation) — DONE; пункт §03 line 217 (legacy retirement) — partial (backend done, frontend deferred 3.5b, controller deferred 3.5c).
- pack §03 line 312 ("If remaining auth hardening leaves legacy-only sensitive paths or inconsistent session validation, admin lifecycle remains limited to read-only admin list") — после этого slice'а consistent session validation **ensured**, прямой блок снят backend-side. Frontend / controller cleanup закрывают gate полностью после 3.5b/c.
- Test baseline после 3.4a → after 3.5a: same suites, ±5-10 tests (drop ~2 legacy fallback assertions, add ~5 must-throw assertions, add 5 admin action audit emission tests).
- Anomaly cluster, assignment cluster, saved-views skeleton, alerts skeleton, verification workspace expansion — все untouched.
- Consumer auth path — completely untouched.
- Audit explorer UI — auto-displays new `admin_session_revoke` через generic renderer; никаких UI правок не требуется.
