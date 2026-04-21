# MVP-3.5b Admin Auth Hardening — Frontend URL Migration to `/api/admin-v2/auth/*`

> Status: landed | Phase: post-MVP-3 (Risk 13 mitigation step 2 of 4) | Builds on: 3.5a backend hardening (`AdminAuthSessionModel`-only auth path), pack §03 lines 196-217, pack §08 Risk 13 lines 680-693, 3.5a §17.5 staged retirement contract, 3.5a §18.1 scope contract

> Slice anchors (gate tokens, do not edit casing): MVP-3.5b, Risk 13, frontend URL migration, BFF folder rename, /api/admin/auth/* removed from admin-v2 frontend, /api/admin-v2/auth/* adopted on admin-v2 frontend, refresh path renamed refresh to refresh-access, LoginForm.tsx migrated, middleware.ts REFRESH_PATH migrated, accept-invite page migrated, reset-password page migrated, BFF route files relocated via git mv, no backend changes, no schema migration, no new capability, no new audit action, no new endpoint, no new DTO, cookie keys unchanged, CSRF flow unchanged, request body unchanged, response shape unchanged, legacy AdminAuthController retained (slice 3.5c), /api/me BFF retained as known cosmetic gap, /logout route retained as known cosmetic gap, Decision: clean rename without shim routes, Decision: refresh-access alignment with backend, Decision: scope strict per 3.5a §18.1, Decision: no /api/me migration in this slice, Clerical correction: 3.5a references (public) not (auth), Old URLs return 404 after deploy.

## Scope landed

- `apps/admin-v2/src/features/auth/LoginForm.tsx:19` — `/api/admin/auth/login` → `/api/admin-v2/auth/login`.
- `apps/admin-v2/src/middleware.ts:12` — `REFRESH_PATH = '/api/admin/auth/refresh'` → `'/api/admin-v2/auth/refresh-access'` (note: подпапка одновременно переименована `refresh` → `refresh-access` для namespace alignment с backend `AdminV2AuthController.@Post('refresh-access')`).
- `apps/admin-v2/src/app/(auth)/accept-invite/page.tsx:16` — `/api/admin/auth/invitations/accept` → `/api/admin-v2/auth/invitations/accept`.
- `apps/admin-v2/src/app/(auth)/reset-password/page.tsx:16` — `/api/admin/auth/password/reset` → `/api/admin-v2/auth/password/reset`.
- BFF route files relocated via `git mv` (4 files), folder `apps/admin-v2/src/app/api/admin/` removed empty:
  - `apps/admin-v2/src/app/api/admin/auth/login/route.ts` → `apps/admin-v2/src/app/api/admin-v2/auth/login/route.ts`
  - `apps/admin-v2/src/app/api/admin/auth/refresh/route.ts` → `apps/admin-v2/src/app/api/admin-v2/auth/refresh-access/route.ts`
  - `apps/admin-v2/src/app/api/admin/auth/invitations/accept/route.ts` → `apps/admin-v2/src/app/api/admin-v2/auth/invitations/accept/route.ts`
  - `apps/admin-v2/src/app/api/admin/auth/password/reset/route.ts` → `apps/admin-v2/src/app/api/admin-v2/auth/password/reset/route.ts`
- Содержимое перенесённых route-файлов **не редактировалось**: они уже сейчас проксируют на backend `${baseUrl}/admin-v2/auth/*` (см. pre-slice line refs: login:29, refresh:14, invitations:21, password-reset:21). Меняется только filesystem path, по которому Next.js резолвит маршрут.
- Старые URL `/api/admin/auth/*` на admin-v2 frontend → 404 после deploy. Намеренное side-effect; никаких shim / 308-redirect / rewrite не введено.

## Explicitly out of slice

- Backend (`apps/api-v2/**`) целиком — frozen. Включая `AdminAuthController`, `AdminV2AuthController`, `AdminAuthService`, `AuthGuard`, `JwtAuthGuard`, `AdminActionAuditService`, `AuthAuditService`.
- Schema migrations (`schema.prisma`, `prisma/migrations/`) — frozen.
- Cookie keys (`getAdminAccessTokenCookieKey`, `getAdminRefreshTokenCookieKey`, `getAdminCsrfTokenCookieKey`) — shared между legacy и admin-v2 backend контроллерами; URL namespace migration их не затрагивает.
- CSRF flow (`apps/api-v2/src/shared-common/csrf-protection.ts`, `apps/admin-v2/src/lib/auth-cookie-policy.ts`) — frozen.
- Request bodies (loginSchema, JSON forwarding via `requireJsonBody`/`buildAuthMutationForwardHeaders`) — unchanged.
- Response shapes (raw text passthrough из backend в BFF response) — unchanged.
- Legacy `AdminAuthController` (`/api/admin/auth/*` backend) — frozen. Controller остаётся registered в `apps/api-v2/src/admin/admin.module.ts:28`. Полное удаление = slice 3.5c (после этого slice'а unblocked, потому что admin-v2 frontend больше не вызывает его).
- `/api/me` BFF (`apps/admin-v2/src/app/api/me/route.ts`) — frozen. Cosmetic namespace gap (роут не под `/api/admin-v2/`) известен; миграция при необходимости — отдельный optional slice (e.g., 3.5b.1) либо вместе с 3.5d. См. Decision: scope strict per 3.5a §18.1.
- `/logout` route (`apps/admin-v2/src/app/logout/route.ts`) — frozen. Аналогичный cosmetic gap; уже корректно вызывает backend `/admin-v2/auth/logout` (line 22). Frozen по той же причине.
- Backend test files (`apps/api-v2/test/admin-auth-lifecycle.e2e-spec.ts`, `apps/api-v2/test/admin-step-up.e2e-spec.ts`, `apps/api-v2/src/swagger-cookie-auth.spec.ts`, `apps/api-v2/src/auth/jwt.strategy.spec.ts`, `apps/api-v2/src/common/interceptors/consumer-action.interceptor.spec.ts`) — frozen. Они тестируют backend legacy controller, который остаётся active.
- Documentation files (`docs/PROJECT_DOCUMENTATION.md`, `docs/FEATURES_CURRENT.md`, `docs/SWAGGER_COOKIE_AUTH_USAGE.md`, `apps/api-v2/README.md`, `apps/api/README.md`, `CHANGELOG.md`, `apps/api-v2/src/swagger-cookie-auth.ts`, `apps/api/src/swagger-cookie-auth.ts`) — frozen. Pre-existing упоминания `/api/admin/auth/*` ссылаются на backend legacy controller, который остаётся active.
- Consumer middleware (`apps/consumer/src/middleware.ts`, `apps/consumer-css-grid/src/middleware.ts`, `apps/consumer-mobile/src/middleware.ts`) — frozen. Этот slice — admin-v2-only.
- Cross-admin revoke / observability / `revoke_reason` enum / refresh_reuse alert — slice 3.5d.
- New BFF route tests или middleware regression tests — не required (см. §11). Pre-existing test gap (0 тестов на BFF-роуты и middleware-литералы) задокументирован, но не закрывается этим slice'ом.

## Decision: clean rename without shim routes

- Pre-slice: 4 frontend reference используют namespace `/api/admin/auth/*`, который резолвится в Next.js BFF под тем же namespace.
- Post-slice: 4 frontend reference используют namespace `/api/admin-v2/auth/*`, BFF переехал в зеркальный namespace; старые URL → 404.
- Альтернативы:
  - **308-redirect shim** (старая папка возвращает 308 на новый URL): создаёт extra wire roundtrip на каждый non-cached deploy window request; вводит дополнительный код-путь, который потом нужно отдельно удалять (slice 3.5b.1); противоречит 3.5a §17.5 принципу "small, reviewable, isolated rollback" (rollback shim'а сам по себе требует commit).
  - **Rewrite через `next.config.ts`** (`/api/admin/auth/*` → `/api/admin-v2/auth/*`): runtime-конфигурация ради временного маппинга — over-engineering; делает "actual URL" непрозрачным для grep'а; противоречит §1.12 (next.config frozen).
  - **Чистое переименование (chosen)**: zero runtime overhead, clean semantic boundary (старый URL гарантированно 404, никакая клиентская легаси не "работает по инерции"), minimum diff, minimum test surface.
- Обоснование, почему 404 безопасен:
  - `/api/admin/auth/*` на admin-v2 frontend — POST-only fetch endpoints. Не bookmarkable. Не кэшируются (POST responses).
  - Никаких внешних потребителей: admin-v2 — собственный SPA shell, single-app, internal audience. Никаких third-party integrations не использует BFF endpoints frontend SPA.
  - Frontend bundle с старыми URL (загруженный admin'ом до deploy) после следующего refresh / login attempt получает обновлённый bundle с новыми URL. Race-condition window — единичные seconds в момент deploy.
  - Backend `/api/admin/auth/*` — другой сервис, не затрагивается; legacy controller остаётся reachable (slice 3.5c удалит его).

## Decision: BFF refresh path renamed `refresh` → `refresh-access` для namespace alignment с backend

- Pre-slice: BFF подпапка `refresh/` (URL `/api/admin/auth/refresh`) проксирует на backend `${baseUrl}/admin-v2/auth/refresh-access` (см. `apps/admin-v2/src/app/api/admin/auth/refresh/route.ts:14`). Pre-existing namespace mismatch: BFF endpoint name (`refresh`) ≠ backend endpoint name (`refresh-access`).
- Post-slice: BFF подпапка `refresh-access/` (URL `/api/admin-v2/auth/refresh-access`) проксирует на тот же `${baseUrl}/admin-v2/auth/refresh-access`. Mismatch устранён.
- Альтернативы:
  - **Сохранить `refresh` имя на BFF** (URL `/api/admin-v2/auth/refresh`): сохраняет namespace mismatch, делает client-side литералы `refresh-access` несоответствующими existing BFF имени; противоречит 3.5a §18.1 explicit scope (`middleware.ts:12 → /api/admin-v2/auth/refresh-access`).
  - **Переименовать backend `refresh-access` → `refresh`**: backend change, нарушает §1.1; также нарушит legacy `AdminAuthController.@Post('refresh-access')` (`apps/api-v2/src/admin/auth/admin-auth.controller.ts:94`), который тоже назван `refresh-access`.
  - **Rename BFF (chosen)**: align frontend с backend authoritative name; minimal diff (1 folder rename, 1 literal change in middleware); устраняет историческое расхождение в этом же slice'е.
- 3.5a §18.1 четвёртой строкой явно указывает: `apps/admin-v2/src/middleware.ts:12 → /api/admin-v2/auth/refresh-access` — это exact match решения этого slice'а.

## Decision: scope strict per 3.5a §18.1 — `/api/me` и `/logout` не переименовываются

- 3.5a §18.1 перечисляет **ровно 4** frontend reference: LoginForm, middleware, accept-invite, reset-password. `/api/me` BFF и `/logout` route — не в перечне.
- Pre-slice cosmetic gaps:
  - `/api/me` BFF (`apps/admin-v2/src/app/api/me/route.ts`) проксирует на backend `${baseUrl}/admin-v2/me` (line 15) — backend target правильный (admin-v2 namespace), но BFF URL `/api/me` остаётся top-level (не под `/api/admin-v2/`). Cosmetic несогласованность, не functional issue.
  - `/logout` route (`apps/admin-v2/src/app/logout/route.ts`) — не под `/api/` вообще; это форм-action endpoint Next.js shell, который вызывает backend `${baseUrl}/admin-v2/auth/logout` (line 22). Аналогичный cosmetic gap.
- Альтернативы (рассматривались до landing'а 3.5b):
  - **Переименовать `/api/me` → `/api/admin-v2/me`**: требует одновременного изменения `apps/admin-v2/src/middleware.ts:122` (`new URL('/api/me', req.url)`); расширяет blast radius middleware до второго литерала в одном slice'е; не входит в 3.5a §18.1 contract.
  - **Переименовать `/logout` → `/admin-v2/logout`**: меняет user-visible URL surface (form action target), требует поиска всех `<form action>` reference в shell pages; out of scope этого slice'а.
- Текущее решение: **strict scope** per 3.5a §18.1. Cosmetic gaps задокументированы как known follow-ups; миграция при желании — отдельный optional slice (3.5b.1 либо вместе с 3.5d). Никаких immediate functional consequences.

## Clerical correction: 3.5a §7.1 / §18.1 referenced `(public)` instead of `(auth)`

- `admin-v2-handoff/SLICE-MVP-3.5a-admin-auth-hardening-plaintext-retirement.md` §7.1 и §18.1 ссылаются на `apps/admin-v2/src/app/(public)/accept-invite/page.tsx` и `apps/admin-v2/src/app/(public)/reset-password/page.tsx`.
- Реальный путь (verified `Glob apps/admin-v2/src/app/**/accept-invite*` + `Glob apps/admin-v2/src/app/**/reset-password*`): `apps/admin-v2/src/app/(auth)/accept-invite/page.tsx` и `apps/admin-v2/src/app/(auth)/reset-password/page.tsx`. Группа называется `(auth)`, не `(public)`.
- Этот slice использует **фактический** путь `(auth)` для §6.3 / §6.4. Без правки самого 3.5a (он landed, immutable per principle). Clerical fix зафиксирован здесь, в reconciliation note.
- Никаких других clerical errors в 3.5a не обнаружено.

## Reconciles

- Risk 13 (pack §08 lines 680-693) — продвижение mitigation track: backend hardening (3.5a) уже landed, frontend URL migration (3.5b — этот slice) landed. Pack §03 line 217 (legacy retirement) — partial: backend done через 3.5a, frontend now done через 3.5b, controller deletion deferred 3.5c.
- pack §03 line 312 ("If remaining auth hardening leaves legacy-only sensitive paths or inconsistent session validation, admin lifecycle remains limited to read-only admin list") — после landing'а 3.5b admin-v2 frontend больше **не использует** legacy `/api/admin/auth/*` backend; оставшийся pre-condition для full closure — slice 3.5c (controller delete + verify нет других consumers).
- Test baseline после 3.5a (28 suites / 260 tests per `admin-v2-handoff/README.md` MVP-3 closing note) → after 3.5b: **то же** (никаких новых tests, никаких затронутых тестов; см. §11 этого handoff'а).
- Pre-existing test gap для BFF-роутов и middleware-литералов (0 тестов) — **не закрывается** этим slice'ом. Задокументирован как known limitation; reasonable trade-off для file-system rename + 4 string literal updates с автоматической верификацией через `yarn build`.
- Backend `/api/admin/auth/*` endpoints (`AdminAuthController`) остаются functional, но больше **не вызываются** admin-v2 frontend. Это closing pre-condition для 3.5c.
- Cookie keys, CSRF flow, request bodies, response shapes — все unchanged. Если admin был залогинен до deploy с session-backed токенами (после 3.5a — все active sessions session-backed), он продолжает работать без re-login: cookies остаются valid, refresh после rotate работает через новый middleware path.
- Anomaly cluster, assignment cluster, saved-views skeleton, alerts skeleton, verification workspace expansion, audit explorer UI — все untouched.
- Consumer auth path — completely untouched.
