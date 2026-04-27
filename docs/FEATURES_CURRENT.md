# Current Implemented Features

List of features and repository workflows that are implemented and present in the repo now.

## Sources Used

- Current backend modules, controllers, routes, and tests under the maintained `apps/api-v2` surface.
- Current frontend apps under `apps/admin-v2` and `apps/consumer-css-grid`.
- Current root workflows in `package.json`, `turbo.json`, and `.husky/pre-commit`.
- Current database schema at `packages/database-2/prisma/schema.prisma`.
- Current operational docs in `docs/CONSUMER_AUTH_COOKIE_POLICY.md` and `docs/API_V2_PRODUCTION_RELEASE_GATE.md`.

## Monorepo State Now

- The maintained workspace layout is centered on `apps/api-v2`, `apps/admin-v2`, and `apps/consumer-css-grid`.
- Root development commands exist for the maintained release surfaces: `yarn dev:api-v2`, `yarn dev:admin-v2`, and `yarn dev:consumer-css-grid`.
- Root database workflow is driven through `packages/database-2` with `yarn db:generate`, `yarn db:validate`, `yarn db:migrate`, `yarn db:deploy`, and `yarn db:studio`.
- `turbo.json` wires `db:generate` into the monorepo lifecycle, so root `dev` and `build` depend on Prisma generation.
- Root tests are intentionally local-only via `scripts/ensure-local-development.js`. Local e2e/test DB flows rely on `@remoola/test-db` and Testcontainers, so Docker is part of the expected development setup.
- `.husky/pre-commit` skips lint/tests for docs-only changes; for code changes it runs staged lint, typecheck, and test helpers. Fast e2e fallback is handled in `.husky/pre-push` via `apps/api-v2`.

## Implemented and Working Now

### Backend (APIs)

Current backend authority:

- `apps/api-v2` is the backend authority for `apps/consumer-css-grid` and the synchronized auth-sensitive cutover surface.

Authentication and identity:

- Admin auth with login, refresh, logout, and `/me` identity.
- Consumer auth with login, refresh, logout, `/me`, and multi-step signup.
- Password recovery and reset: forgot-password (request email; `POST /consumer/auth/forgot-password` requires explicit `appScope`, and backend requires exact match between the claim and `x-remoola-app-scope`), token-only verify (`GET /consumer/auth/forgot-password/verify?token=...` redirects only via stored valid `appScope` and otherwise fails with `ORIGIN_REQUIRED`), reset with token (`POST /consumer/auth/password/reset`), and authenticated password update (`PATCH /consumer/profile/password`). The authenticated route supports both password change and first-time password creation for Google-only / no-password accounts: `currentPassword` is required only when a stored password already exists, and successful password set/change revokes active consumer sessions. Reset tokens stored as SHA-256 hash only in DB together with canonical `app_scope` (migrations `20260317120000_reset_password_token_hash`, `20260317120001_drop_reset_password_token`, `20260406120000_reset_password_store_app_scope`); expired tokens cleaned by scheduler. Auth notices in `@remoola/api-types` now include `password_changed`, `password_set`, and `reset_success` for post-login/post-reset messaging. E2E coverage is maintained in `apps/api-v2/test/forgot-reset-password.e2e-spec.ts`.
- Cookie-based JWT auth with access/refresh tokens. Shared auth cookie policy: cookie names and options from `@remoola/api-types`; the maintained browser auth contract uses the canonical `consumer-css-grid` namespace in production (`__Host-consumer_css_grid_*`). Refresh tokens are signed and verified with `JWT_REFRESH_SECRET`, distinct from `JWT_ACCESS_SECRET`.
- Consumer auth sessions: `auth_sessions` table for database-backed consumer sessions; hashed refresh token storage; session family and refresh rotation lineage (`session_family_id`, `replaced_by_id`); revocation metadata (`revoked_at`, `invalidated_reason`). Migration `20260310123000_consumer_auth_sessions`.
- Login audit (success/failure tracking) and account lockout (per-email after N failures).
- Google OAuth endpoints for consumer login flows: `GET /google/start`, `GET /google/callback`, `GET /google/signup-session`, `POST /oauth/complete`. Browser-facing consumers use frontend BFF routes such as `/api/consumer/auth/google/start`, `/api/login`, `/api/consumer/auth/refresh`, and `/api/oauth/complete`; state-changing auth requires explicit `x-remoola-app-scope` plus matching scoped CSRF header/cookie where applicable. OAuth `/google/start` uses the canonical `consumer-css-grid` app scope at runtime, and legacy scope values are normalized into that single maintained surface. Backend routing stores canonical `appScope` in OAuth state and callback/handoff redirects are built through `appScope -> configured origin`, not through stored raw origin. `OriginResolverService` now validates `appScope` and canonical scope/origin mapping rather than request-derived consumer trust.
- Signup verification hardening: verification email links are now token-only and no
  longer include `email` or routing-layer `referer` query params; signed verification
  tokens carry canonical `appScope`, and successful post-verification redirects may
  still include `email` (current compatibility behavior expected by tests).
- OAuth missing-state-cookie compatibility fallback is restricted to development/test only; startup/runtime block it in staging/production.
- OAuth crypto utilities via `@remoola/security-utils` (PKCE, nonce, state signing/hashing).
- Database connection retry logic (30 attempts, 500ms delay) in API bootstrap.

Consumer domain features:

- Dashboard aggregation endpoint.
- Contacts CRUD and contact details (list paginated: page, pageSize). Search for
  autocomplete: GET `consumer/contacts?query=<string>&limit=10` returns minimal
  list (id, name, email) filtered by authenticated consumer (email/name ILIKE).
- Contracts listing (paginated).
- Document upload, tagging, and attachment to payments (documents list paginated).
- Exchange rates, currency conversion, auto-conversion rules, scheduled FX conversions (rules and scheduled lists paginated), and admin review/override.
- Payment methods CRUD (manual).
- Stripe checkout sessions, setup intents, confirmations, saved-method payments. Redirect-capable
  ancillary Stripe checkout session flows now require explicit consumer `appScope`;
  backend validates the explicit `x-remoola-app-scope` header against that claim and resolves the
  success/cancel origin through canonical `appScope -> origin` mapping rather than
  request-derived routing.
- Consumer web/mobile/css-grid BFF and server-side mutation helpers depend on
  explicit configured app origins in production rather than Vercel deployment
  metadata fallback. For this release, canonical production domains are the only
  supported auth/CSRF smoke surface; preview / branch deployment hostnames are
  explicitly unsupported as release evidence.
- Consumer Verify Me lifecycle via canonical
  `POST /consumer/verification/sessions` (legacy-compatible
  `POST /consumer/webhooks/stripe/verify/start` still delegates to the same
  flow); start reuses the active Stripe Identity session when possible and
  requires profile complete (legal status, tax ID, passport/ID or phone per
  account type), returning `PROFILE_INCOMPLETE_VERIFY` when incomplete.
- Consumer Stripe Identity state is persisted on `consumer` (lifecycle status,
  active session id, last error, started/updated/verified timestamps); shared
  verification-state helpers drive consistent dashboard/settings retry /
  continue / verified / needs-attention UX in web and consumer-mobile.
- Managed Stripe Identity webhook lifecycle updates ignore stale sessions and
  preserve compliance-critical identity fields on verification success.
- Stripe webhook top-level failure handling emits sanitized warning telemetry (`stripe_webhook_processing_failed`) without raw payload/error text.
- Payments list, balance, history, start payment, withdraw, transfer, and payment view.
- Payment request creation and send flow. Send-email ancillary routing now also carries
  explicit consumer `appScope`, so payment-request email links resolve through the
  canonical configured origin for the calling app instead of request-derived routing.
  This ancillary `appScope` contract is documented as a synchronized no-skew
  cutover, not as a rolling backward-compatible migration.
- Profile management (personal, address, organization) and password updates. Profile reads/updates return a safe consumer payload without password hash/salt and include `hasPassword` so web/mobile settings can render `Change Password` versus `Set Password`.
- User settings for theme preference and preferred display currency (api-types allowlist).
- Invoice generation for payment requests.

Admin domain features:

- Admin management (list, create, details, password change, delete/restore with SUPER guard). Step-up (re-enter password) required for password change and admin delete.
- Consumer management (list/details) and verification workflow (approve/reject/flag/more info).
- Dashboard metrics: status totals, recent payment requests, ledger anomalies, verification queue.
- Ledger list endpoint.
- Payment requests listing, expectation-date archive, details, plus refund and chargeback actions (step-up password confirmation required for reversal).
- Admin-side migration endpoint for payment method migration.
- Exchange rate management (list/create/update/delete) and supported currencies.
- Admin action audit: append-only `admin_action_audit_log`; sensitive actions (refund, chargeback, admin CRUD, consumer verification, exchange rate/rule/scheduled) recorded with admin id, action, resource, IP, user agent.
- Audit read endpoints: GET `/admin/audit/auth` (auth_audit_log for admins, paginated, SUPER-only), GET `/admin/audit/actions` (admin_action_audit_log, paginated, filters, SUPER-only).

Infrastructure and platform:

- Transactional email via Brevo API (no SMTP); env: `BREVO_API_KEY`, `BREVO_API_BASE_URL`; boot-time verification optional (`BREVO_VERIFY_ON_BOOT`).
- Production outbound email and invoice links use explicit origin/branding envs:
  `NEST_APP_EXTERNAL_ORIGIN` (required outside dev/test by `resolveEmailApiBaseUrl`)
  and `PUBLIC_BRAND_WEBSITE_URL` (invoice v5 branding/site link).
- Invoice email/PDF template behavior: explicit `InvoiceForTemplate.payOnlineUrl`
  accepts only absolute `http(s)` URLs; invalid values fall back to the
  env-derived/default link (`CONSUMER_CSS_GRID_APP_ORIGIN` or local development default).
- Nest API auth is namespaced under `/api/admin/auth` and `/api/consumer/auth` only (`JwtPassportModule` registers the shared JWT strategy; there is no root `/api/auth` controller on the API). The Admin Next.js app may expose BFF routes under `/api/auth/*` that proxy to backend admin auth.
- Health endpoints (`/health`, `/health/detailed`, `/health/mail-transport`, `POST /health/test-email`) for service, DB, mail transport, and optional test-email.
- CORS configuration and security headers (Helmet).
- Rate limiting and response compression.
- Structured request logging with correlation IDs.
- Prisma-based data access and error handling.
- Swagger documentation for API endpoints and DTOs.

### Admin V2 App (Next.js)

Admin UI with:

- Login flow and authenticated protected sections; centralized 401/session-expired flow (toast, clear cookies via logout, redirect to login with `next`).
- Dashboard with metrics, verification queue, recent payment requests, and ledger anomalies.
- Admin management pages (list and details).
- Consumer management pages (list and details + verification actions).
- Payment request list, details, and expectation-date archive views.
- Ledger list view and anomalies view.
- Exchange rate management pages (list, create, edit, delete).
- Audit section (SUPER-only): Auth log tab (login/logout/lockout) and Actions tab (admin action audit), paginated.
- Theme switching (light/dark/system) using CSS custom properties.

Internal API proxy routes:

- Admin auth proxy: login/refresh/password-reset/invitation-accept via Next.js `/api/admin-v2/auth/*` BFF routes.
- Session identity proxy: `GET /api/me`.
- Proxy forwards all Set-Cookie headers (multi-cookie via `getSetCookie`/`appendSetCookies`).
- Admin proxy mutation boundaries enforce JSON payload contracts (`application/json`, valid JSON), reject oversized payloads (`413 PAYLOAD_TOO_LARGE`), and forward an allowlisted request-header set (`cookie`, content negotiation, idempotency/correlation, csrf, `x-remoola-*`).
- Proxy forwards all Set-Cookie headers (multi-cookie via `getSetCookie`/`appendSetCookies`).
- Admin proxy mutation boundaries enforce JSON payload contracts (`application/json`, valid JSON), reject oversized payloads (`413 PAYLOAD_TOO_LARGE`), and forward an allowlisted request-header set (`cookie`, content negotiation, idempotency/correlation, csrf, `x-remoola-*`).

### Consumer App (Next.js)

Consumer UI with:

- Login, logout, OAuth callback, and signup flow (multi-step); auth refresh and session-expired handling.
- Signup start and completion confirmation pages; email verification page handles `verified` without `email` in the query (optional `email` still shown when the redirect includes it), with refreshed verification/completion copy and clearer invalid/expired-link messaging.
- Dashboard with summaries, tasks, and activity; “Verify Me” vs “Complete your
  profile” (link to settings) based on profile-complete task from API.
- Shell navigation with icon-based desktop sidebar labels, plus a command palette that can open from the header search control or keyboard shortcut (`Cmd+K` on Apple platforms, `Ctrl+/` on Linux/Windows).
- Mobile shell navigation keeps the primary bottom bar focused on Home, Payments, Contacts, and Contracts; secondary destinations such as Documents, Bank & Cards, Withdraw, Exchange, and Settings move into a `More` drawer.
- Contacts list (paginated, layout aligned with Documents), create/edit/delete, and detail pages.
- Contracts list (paginated).
- Documents upload, list (paginated), tagging, and attach-to-payment flow.
- Exchange screen with rates, balances, and conversion; currency options from api-types (CURRENCY_CODES).
- Payment methods management, including Stripe setup flows.
- Payment requests creation and send flow.
- Payments list (paginated, filters), details, start payment, transfer, withdraw, and invoice generation.
- Profile settings (personal, address, organization, password), including a `Set Password` flow for Google-first accounts that do not yet have a stored password.
- Theme and preferred currency settings (light/dark/system; currency from api-types allowlist), with resolved theme applied before paint to reduce flash and hydration mismatch on initial load.
- Shared UI: PaginationBar (Showing X–Y of Z, Previous/Next), AmountCurrencyInput,
  RecipientEmailField (with recipient email autocomplete: debounced contact search,
  dropdown "Name — email", clear, keyboard accessible); form controls 42px/rounded-lg;
  Contacts and Documents pages share same layout pattern.
- Signup/profile validation refinements include stricter calendar-based date parsing for date of birth, country-aware passport/ID examples and validation, richer address prefill parsing across US/Canada/UK/Russia/Germany formats (with `countryHint` support for ambiguous inputs), and clearer Tax ID guidance in validation copy.

Internal API proxy routes:

- Auth (including refresh), signup, profile, settings (theme, preferred-currency).
- Contacts, contracts, documents, exchange (query params forwarded, including page/pageSize).
- Payments, payment requests, payment methods, Stripe flows.
- OAuth exchange proxy endpoint.
- Exchange quote and batch rate proxy endpoints.
- Proxy responses forward all Set-Cookie headers (`appendSetCookies`); authenticated proxy and server fetches use `cache: no-store`.
- Mutation proxy endpoints enforce JSON boundary validation before backend forwarding (`Content-Type: application/json`, valid JSON body); invalid requests return `400` (`INVALID_CONTENT_TYPE`/`INVALID_JSON`) and oversized JSON payloads return `413` (`PAYLOAD_TOO_LARGE`).

### Legacy Consumer Apps

Legacy consumer apps are no longer part of the maintained release surface. Their redirect and auth-routing responsibility now lives on `apps/consumer-css-grid`.

### Database (Prisma)

Key data models and relations:

- Admins, consumers, access/refresh tokens, OAuth state, password reset tokens, Stripe webhook event dedup (`StripeWebhookEventModel`), auth audit and lockout.
- Consumer profile details (address, personal, organization, Google profile).
- Consumer settings (theme, preferred display currency); Admin settings (theme).
- Payment requests, payment request attachments, ledger entries; ledger entry outcomes and disputes (append-only).
- Payment methods with Stripe identities and billing details.
- Exchange rates, wallet auto-conversion rules, scheduled FX conversions.
- Contacts.
- Documents/resources with tagging and access control.

Ledger and payments:

- Signed ledger entries with idempotency key for exactly-once processing; **append-only** financial history (no UPDATE/DELETE on ledger rows); status transitions and dispute data in `LedgerEntryOutcomeModel` and `LedgerEntryDisputeModel` with DB trigger syncing `ledger_entry.status`.
- Stripe webhook event deduplication via `StripeWebhookEventModel` (unique `event_id`); insert-before-handling for at-most-once processing.
- Payment rails, statuses, fee handling, and enums (including ExchangeRateStatus, TransactionActionType, ScheduledFxConversionStatus).
- Soft-delete strategy (deletedAt) with uniqueness scoped to non-deleted rows.
- Migration `20260316150500_enforce_ledger_entry_dispute_unique` rollout supports preferred predeploy `CREATE UNIQUE INDEX CONCURRENTLY` for non-empty DBs and a CI-safe in-migration fallback when the index is absent.
- Database column naming: snake_case in schema (Prisma fields use `@map("snake_case")` where needed).

Shared packages present in repo:

- `api-types`: shared DTOs, PaginatedResponsePage, currency (`CURRENCY_CODES`, `TCurrencyCode`, `getCurrencySymbol`), consumer settings (`THEME`, preferred currency allowlist), admin payment reversal (`PAYMENT_REVERSAL_KIND`), query params (`BOOLEAN_QUERY_VALUE`), and validators reused by API and frontend schemas.
- `database-2`: Prisma schema, migrations, generated client, and the root DB command surface.
- `security-utils`: crypto, token hashing (`hashTokenToHex`), password helpers, and OAuth crypto utilities.
- `test-db`, `db-fixtures`, and `api-e2e`: local test DB helpers, fixtures, and shared e2e Jest configs.
- `shared-constants`, `eslint-config`, `jest-config`, `typescript-config`, and `ui`: shared constants, tooling, and UI components.
- `ui`: `cn()` now uses `tailwind-merge` to safely collapse conflicting Tailwind utility classes.

Infrastructure and testing:

- Root `yarn test`, `yarn test:e2e`, and `yarn test:e2e:fast` are gated by `scripts/ensure-local-development.js`: they run only in local development and are blocked in CI and on Vercel to avoid accidental production/CI DB usage.
- Root pre-commit checks build `@remoola/test-db`, run maintained unit tests, and `apps/api-v2` fast e2e after linting.
- Local e2e/test DB flows rely on Testcontainers through `@remoola/test-db`, so Docker availability is an expected prerequisite.
- Fintech safety and DB compliance are documented in `docs/FINANCIAL_SAFETY_AND_DB_COMPLIANCE.md`; schema design rules in `docs/postgresql-design-rules.md`.

## Comparison Notes (History vs Current State)

Confirmed as present in current code:

- Payment requests flow, payments, wallet/transfer/withdraw.
- Exchange rates and conversion.
- Stripe payment methods, setup intents, webhooks, and identity verification start.
- Consumer profile management and signup flow.
- Admin dashboard metrics, verification workflow, and ledger access.
- Theme switching for consumer and admin apps.
- Health checks, security headers, rate limiting, logging.
- Admin exchange rate management and supported currency listing.
- Admin payment request refund and chargeback actions.
- OAuth token exchange and batch exchange rates endpoints.

Historical items not active as a standalone feature now:

- A past "admin app Vercel deployment config" commit was explicitly reverted.
- Earlier admin SWR-based architecture was replaced with direct API proxy routes.
