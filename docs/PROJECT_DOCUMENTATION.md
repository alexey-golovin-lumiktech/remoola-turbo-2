# Remoola Project Documentation

Single-file documentation covering the maintained `api-v2`, `admin-v2`, `consumer-css-grid`, and database surfaces.

## Overview

Remoola is a Turborepo monorepo with:

- `apps/api-v2`: NestJS backend authority for `consumer-css-grid` and current auth-sensitive cutovers.
- `apps/admin-v2`: Next.js admin dashboard on port `3011`.
- `apps/consumer-css-grid`: Next.js consumer app with css-grid shell on port `3003`.
- `packages/database-2`: Prisma schema, migrations, and generated client.
- Shared packages for API contracts, security utilities, testing, UI, linting, and TS config.

Root workflow highlights:

- Workspaces are defined at the root for `apps/*` and `packages/*`.
- Root `yarn dev` runs workspace dev tasks in parallel and depends on `db:generate`.
- Root `yarn build` generates Prisma first, then runs the Turborepo build pipeline.
- Root DB commands are `yarn db:generate`, `yarn db:validate`, `yarn db:migrate`, `yarn db:deploy`, and `yarn db:studio`.
- There is no root `.env.example`; setup is driven by `packages/database-2/.env.example` plus the per-app `apps/*/.env.example` files you actually need.
- Root `yarn test`, `yarn test:e2e`, and `yarn test:e2e:fast` are local-only entrypoints guarded by `scripts/ensure-local-development.js`.
- Local test/e2e flows rely on `@remoola/test-db` and Testcontainers, so Docker is an expected prerequisite.
- `.husky/pre-commit` skips docs-only changes and otherwise runs lint, builds `@remoola/test-db`, then runs maintained unit tests plus `apps/api-v2` fast e2e coverage.

## API (NestJS) - Implemented Features

Base backend lives in `apps/api-v2`, which is the maintained backend authority for `consumer-css-grid` and the synchronized auth-sensitive release surface documented in `docs/API_V2_PRODUCTION_RELEASE_GATE.md`. All API routes use the global prefix `/api` (e.g. `/api/admin/auth`, `/api/consumer/auth`). Auth on the Nest API is namespaced under `admin` and `consumer` only; shared JWT wiring lives under `apps/api-v2/src/auth` (`JwtPassportModule`, `JwtStrategy`) and does not expose a root `/api/auth` route. The Admin Next.js app may still use BFF paths like `/api/auth/login` that proxy to `/api/admin/auth` on the backend.

### Admin APIs

Auth (`/admin/auth`):

- `POST /login`: authenticate admin; sets access/refresh cookies.
- `POST /refresh-access`: refresh access token.
- `POST /logout`: clear auth cookies.
- `GET /me`: current admin identity.

Admins (`/admin/admins`):

- `GET /`: list admins.
- `POST /`: create admin (SUPER only).
- `GET /:adminId`: admin details.
- `PATCH /:adminId/password`: change admin password (SUPER only).
- `PATCH /:adminId`: delete or restore admin (SUPER only).
- `POST /system/migrate-payment-methods`: migration for payment methods (SUPER only).

Consumers (`/admin/consumers`):

- `GET /`: list consumers.
- `GET /:id`: consumer details.
- `PATCH /:id/verification`: update verification status and reason.

Dashboard (`/admin/dashboard`):

- `GET /stats`: high-level stats.
- `GET /payment-requests-by-status`: distribution of payment request statuses.
- `GET /recent-payment-requests`: recent requests list.
- `GET /ledger-anomalies`: anomaly list for ledger.
- `GET /verification-queue`: consumers awaiting verification.

Ledger (`/admin/ledger`):

- `GET /`: list ledger entries or ledger view data.

Payment Requests (`/admin/payment-requests`):

- `GET /`: list all payment requests.
- `GET /expectation-date-archive`: list payment requests in expectation-date archive (query params).
- `GET /:id`: payment request details.
- `POST /:id/refund`: create refund reversal for a payment request.
- `POST /:id/chargeback`: create chargeback reversal for a payment request.

Exchange (`/admin/exchange`):

- `GET /rules`: list auto-conversion rules across consumers.
- `PATCH /rules/:ruleId`: update/override a rule.
- `POST /rules/:ruleId/run`: force-run a rule immediately.
- `GET /scheduled`: list scheduled FX conversions.
- `POST /scheduled/:conversionId/cancel`: cancel a scheduled conversion.
- `POST /scheduled/:conversionId/execute`: force-execute a scheduled conversion.
- `GET /rates`: list exchange rates (with query filters).
- `GET /rates/:rateId`: get exchange rate details.
- `POST /rates`: create exchange rate.
- `PATCH /rates/:rateId`: update exchange rate.
- `DELETE /rates/:rateId`: delete exchange rate.
- `GET /currencies`: list supported currencies.

### Consumer APIs

Auth (`/consumer/auth`):

- `POST /login`: login and set auth cookies.
- `POST /refresh`: refresh access token (cookie-based refresh; CSRF required).
- `POST /refresh-access`: legacy body `refreshToken` refresh (prefer `POST /refresh` for browser clients).
- `POST /logout`: revoke current session; clears cookies (CSRF required).
- `POST /logout-all`: revoke all sessions for the consumer (authenticated; CSRF required).
- `GET /me`: current consumer identity.
- `POST /signup`: create consumer account.
- `GET /signup/:consumerId/complete-profile-creation`: finalize profile and send verification email.
- `GET /signup/verification?token=…`: verify account by token only. Verification email
  links omit both `email` and routing-layer `referer`; the signed token now carries
  canonical `appScope`, and successful redirects to the consumer verification page may
  still include `email` for compatibility/UX.
- Forgot-password and reset (no auth required): `POST /forgot-password` (email; requires explicit `appScope=consumer-css-grid`, and the backend requires exact match between claimed `appScope` and `x-remoola-app-scope`); `GET /forgot-password/verify?token=…` — token-only verify contract; validate token and redirect only when stored `appScope` is present and valid, otherwise fail with `ORIGIN_REQUIRED`; `POST /password/reset` (body: token, password) — set new password with token from email.
- Authenticated password update: `PATCH /consumer/profile/password` (see Profile below). This route supports both password change and first-time password creation for Google-only / no-password accounts.
- Google OAuth flows:
  - `GET /google/start`: start OAuth flow with explicit `appScope` as the only public redirect identity. Supported contract is `GET /google/start?appScope=consumer-css-grid&next=...`; browser-facing callers are expected to use same-origin BFF routes under `/api/consumer/auth/google/start`, and the backend requires exact match between query `appScope` and `x-remoola-app-scope`.
  - `GET /google/callback`: OAuth redirect handling; reads `appScope` from OAuth state and builds login/signup/callback redirects through configured `appScope -> origin` mapping rather than request-derived origin.
  - `GET /google/signup-session`: fetch OAuth signup session data.
  - `POST /oauth/complete`: exchange short-lived OAuth handoff token for access/refresh cookies. Browser-facing callers must go through frontend same-origin BFF routes rather than calling the API origin directly.

Dashboard (`/consumer/dashboard`):

- `GET /`: aggregated dashboard data for consumer.

Contacts (`/consumer/contacts`):

- `GET /`: list contacts (query: `page`, `pageSize`; response: `items`, `total`, `page`, `pageSize`). If
  `query` is present, returns search results (array of `{ id, name, email }`, default `limit=10`) for
  autocomplete; filtered by authenticated consumer, search by email/name ILIKE.
- `POST /`: create contact.
- `PATCH /:id`: update contact.
- `DELETE /:id`: delete contact.
- `GET /:id/details`: full contact details.

Contracts (`/consumer/contracts`):

- `GET /`: list contracts for consumer (query: `page`, `pageSize`; response: `items`, `total`, `page`, `pageSize`).

Documents (`/consumer/documents`):

- `GET /`: list documents (query: `kind`, `page`, `pageSize`; response: `items`, `total`, `page`, `pageSize`).
- `POST /upload`: upload multiple documents.
- `POST /bulk-delete`: delete multiple documents.
- `POST /attach-to-payment`: attach documents to payment requests.
- `POST /:id/tags`: set document tags.

Exchange (`/consumer/exchange`):

- `GET /rates`: get FX rate for currency pair.
- `POST /rates/batch`: get multiple exchange rates in batch.
- `POST /convert`: currency conversion (consumer context).
- `POST /quote`: get conversion quote without executing.
- `GET /rules`: list auto-conversion rules (query: `page`, `pageSize`; response: `items`, `total`, `page`, `pageSize`).
- `POST /rules`: create auto-conversion rule.
- `PATCH /rules/:ruleId`: update auto-conversion rule.
- `DELETE /rules/:ruleId`: delete auto-conversion rule.
- `GET /scheduled`: list scheduled FX conversions (query: `page`, `pageSize`; response: `items`, `total`, `page`, `pageSize`).
- `POST /scheduled`: create scheduled FX conversion.
- `POST /scheduled/:conversionId/cancel`: cancel scheduled conversion.
- `GET /currencies`: list supported currency codes (aligned with api-types `CURRENCY_CODES`).

Payment Methods (`/consumer/payment-methods`):

- `GET /`: list saved payment methods.
- `POST /`: create manual payment method.
- `PATCH /:id`: update payment method.
- `DELETE /:id`: delete payment method.

Stripe (`/consumer/stripe`):

- `POST /:paymentRequestId/stripe-session`: create checkout session for a payment request.
  Redirect-capable checkout flows now require explicit consumer `appScope`; backend
  validates the explicit `x-remoola-app-scope` header against that claim and resolves the success/cancel
  target through canonical `appScope -> origin` mapping.
  Production now requires an explicit app origin env instead of falling back to
  Vercel deployment metadata. This rollout is documented as a synchronized
  backend + consumer-app cutover only; canonical production domains are
  supported release evidence, while preview / branch deployment auth or CSRF
  smoke is explicitly unsupported.
- `POST /intents`: create setup intent.
- `POST /confirm`: confirm setup intent.
- `POST /:paymentRequestId/pay-with-saved-method`: charge using saved method.

Verification (`/consumer/verification`):

- `POST /sessions`: canonical Verify Me start endpoint. Starts a new Stripe
  Identity session or reuses the active one when the current lifecycle state is
  still in progress.
- Profile completeness gate: requires legal status + tax ID + passport/ID for
  individual contractors, or tax ID + phone for non-individual verification
  flows. Returns 400 `PROFILE_INCOMPLETE_VERIFY` when incomplete.
- Persisted consumer verification state:
  - Stripe Identity lifecycle status
  - active session id
  - last error code / reason
  - started / updated / verified timestamps
- Shared verification-state helpers combine Stripe lifecycle state with admin
  review status so dashboard/settings surfaces can render `Verify Me`,
  `Continue verification`, `Retry verification`, and verified / needs-attention
  states consistently.
- Managed Stripe Identity webhook lifecycle updates (`requires_input`,
  `verified`, `canceled`, `redacted`) ignore stale sessions and only mutate the
  currently active verification session state.

Webhooks (`/consumer/webhooks`):

- `POST /`: Stripe webhook handler.
- `POST /stripe/verify/start`: legacy-compatible Stripe identity verification
  start route. Uses the same profile-completeness checks and delegates to the
  same verification session flow as `POST /consumer/verification/sessions`.

Payments (`/consumer/payments`):

- `GET /`: list payments with pagination, filters, search.
- `POST /start`: start a payment from a request.
- `GET /balance`: available balance.
- `GET /history`: list payment transactions history.
- `POST /withdraw`: withdraw funds.
- `POST /transfer`: transfer funds to another user.
- `GET /:paymentRequestId`: detailed payment view.
- `POST /:paymentRequestId/generate-invoice`: generate invoice for a payment request.

Payment Requests (`/consumer/payment-requests`):

- `POST /`: create payment request.
- `POST /:paymentRequestId/send`: send payment request. Ancillary email-link routing now
  also requires explicit consumer `appScope`, so the backend resolves the payer-facing
  payment link through canonical `appScope -> origin` mapping instead of request-derived
  routing. This ancillary `appScope` contract is a synchronized cutover and is
  not described as a backward-compatible rolling migration.

Profile (`/consumer/profile`):

- `GET /me`: get profile details. Safe profile payload omits password hash/salt and includes `hasPassword` so clients can tailor settings UX.
- `PATCH /update`: update profile details. Returns the same safe profile payload shape as `GET /me`.
- `PATCH /password`: change password when a stored password already exists, or create the first password for a Google-only / no-password account. `currentPassword` is required only when `hasPassword` is true; successful password set/change revokes active sessions so the user signs in again.

Settings (`/consumer/settings`):

- `GET /`: get combined consumer settings (`theme`, `preferredCurrency`).
- `PATCH /`: partially update combined consumer settings (`theme` and/or `preferredCurrency`).
- `GET /theme`: get theme settings only.
- `PUT /theme`: update theme settings only.
- `PUT /preferred-currency`: update preferred display currency (allowlist in api-types).

### Shared Backend Capabilities

Common infrastructure in `apps/api-v2/src/shared` and `apps/api-v2/src/shared-common`:

- Prisma DB module and service.
- Email templates and mailing service (transactional email via Brevo API; see FEATURES_CURRENT.md).
  `InvoiceForTemplate.payOnlineUrl` accepts only absolute `http(s)` URLs when
  explicitly provided; invalid values are ignored and the template falls back to
  env-derived/default links.
- JWT auth guard and interceptors.
- Shared auth cookie policy (cookie names and options from `@remoola/api-types`; __Host- prefix in production); consumer auth backed by `auth_sessions` table (hashed refresh, rotation lineage, revocation).
- Auth audit (login success/failure tracking) and account lockout (per-email after N failures).
- Error filtering and logging.
- Common DTOs used across admin and consumer APIs.
- `OriginResolverService`: centralized consumer `appScope` validation and canonical scope/origin resolution for OAuth and other browser-facing consumer flows. For consumer routing, `appScope` is the only request identity; `Origin` remains only in the browser CORS layer. Trusted production origins are the configured canonical app origins; preview / branch deployment hostnames are not part of the supported auth/CSRF release contract.

Recent runtime hardening (API pipeline and scheduler safety):

- Global request pipeline wiring in `apps/api-v2/src/main.ts` now explicitly includes:
  - `CorrelationIdMiddleware` (normalizes/sets `x-correlation-id`),
  - `deviceIdMiddleware` (consumer-path browser identity resolution),
  - `ConsumerActionInterceptor` (decorator-gated append-only action logging).
- `StripeReversalScheduler` in `apps/api-v2/src/consumer/modules/payment-methods/stripe-reversal.scheduler.ts` uses transaction-scoped advisory lock selection and bounded per-run reconciliation to reduce pooled-connection lock hazards while preserving idempotent outcome writes.
- `StripeWebhookService.processStripeEvent` top-level failure path logs sanitized warning telemetry (`stripe_webhook_processing_failed`) without exposing raw webhook payload/error text in logs.
- Admin and consumer-css-grid BFF mutation routes preserve idempotency/correlation header forwarding and backend `Set-Cookie` passthrough behavior for auth/payment compatibility within their supported backend surfaces.

Consumer/browser tracking reference:

- `docs/CONSUMER_BROWSER_IDENTITY_TRACKING.md`: browser identity (`deviceId`), action tracking (`@TrackConsumerAction` + interceptor), append-only `consumer_action_log`, compatibility contracts, and verification checklist.

## Admin V2 App (Next.js)

Admin UI is in `apps/admin-v2`. It is the maintained operator frontend and uses same-origin BFF routes plus middleware-driven session refresh.

Implemented surfaces include:

- auth pages for login, forgot-password, reset-password, and invitation acceptance
- protected operator pages for overview, consumers, verification, payments, ledger, payouts, payment methods, exchange, documents, audit, admins, and system
- centralized 401/session-expired handling in middleware and logout flow

Internal admin-v2 server routes:

- auth routes under `/api/admin-v2/auth/*`
- identity route `GET /api/me`
- shared header/cookie forwarding through `apps/admin-v2/src/lib/api-utils.ts`
- backend `Set-Cookie` passthrough via `appendSetCookies(...)`

## Legacy Consumer Apps

Removed legacy consumer apps no longer participate in the maintained release surface. Their redirect responsibility and runtime contract now live on `apps/consumer-css-grid`, which is the only supported consumer frontend in this repository.
  - Financial: Bank, CreditCard, CurrencyDollar, Exchange, TrendingUp
  - Documents & Files: Clipboard, ClipboardCopy, ClipboardList, Document, Download, Paperclip, Upload
  - Communication: Bell, Mail, Phone
  - User & Settings: Lock, Logout, Settings, User, Users
  - Status & Feedback: AlertTriangle, Check, CheckCircle, ExclamationCircle, InformationCircle, Spinner, XCircle
  - UI Controls: Calendar, Clock, DotsVertical, Eye, EyeOff, Filter, Lightning, Pencil, SwitchHorizontal, Tag, Trash
- **IconBadge**: Gradient-styled icon container with variants (primary, success, info, warning, danger, secondary), sizes (sm, md, lg), optional ring effects, and interactive hover animations
- **PageHeader**: Mobile-optimized page header component with icon, title, subtitle, badge, and actions slots; supports sticky positioning with backdrop blur
- **SearchInput**: Search input component with magnifying glass icon, clear button (when value present), and mobile-friendly 44px minimum touch target
- **Brand Assets**: `favicon.ico` and `icon.svg` for PWA and browser tab display
- **Error messaging** (`src/lib/error-messages.ts`, `src/lib/toast.client.ts`): API error codes and local toast keys mapped to user-facing messages; use `getErrorMessageForUser`, `getLocalToastMessage`, and `showErrorToast` for consistent toasts across the app

### Test Coverage

- `src/lib/client.test.ts`: Token refresh flows, SWR fetcher, fetchWithAuth utility, retry logic, session expiry handling, query key to URL conversion
- `src/middleware.test.ts`: Next.js middleware authentication flows, token validation, refresh token rotation, OAuth callback handling, cookie security settings

Auth and onboarding:

- `/login`: login form.
- `/logout`: logout route.
- `/auth/callback`: OAuth callback handling.
- `/signup`: multi-step signup flow with address, personal, organization details, stricter date-of-birth validation, country-aware passport/ID hints, richer address parsing across US/Canada/UK/Russia/Germany formats, `countryHint` support where needed, and clearer Tax ID guidance.
- `/signup/start`: account type selection step.
- `/signup/start/contractor-kind`: contractor kind selection.
- `/signup/verification` and `/signup/completed`: verification and completion states with clearer success, failure, and invalid-link messaging.

Main shell routes:

- `/dashboard`: consumer dashboard with summaries and tasks.
- `/contacts`: list (paginated) and manage contacts, contact details view; layout aligned with Documents.
- `/contracts`: contract list (paginated).
- `/documents`: documents list (paginated), upload, tags, attach to payments.
- `/exchange`: currency exchange, balances, rates; currency options from api-types.
- `/exchange/rules`: manage auto-conversion rules (list paginated).
- `/exchange/scheduled`: manage scheduled FX conversions (list paginated).
- `/payment-methods`: manage saved payment methods.
- `/payment-requests/new`: create new payment request.
- `/payments`: list payments (paginated) and filters.
- `/payments/[paymentRequestId]`: payment details view.
- `/payments/start`: start a payment flow.
- `/withdraw-transfer`: withdraw and transfer forms.
- `/settings`: profile, address, organization, password, theme, and preferred currency settings, including first-time password creation for Google-only / no-password accounts.

Consumer shell and shared patterns:

- Header search opens a command palette for quick page/action navigation.
- Desktop sidebar uses icon-backed links and the current product-facing labels.
- Mobile bottom navigation prioritizes Home, Payments, Contacts, and Contracts, with Documents, Bank & Cards, Withdraw, Exchange, and Settings available from `More`.
- Pagination bar (Showing X–Y of Z, Previous/Next) on list tables; amount+currency input and recipient email field components; form controls 42px height and rounded-lg; Contacts and Documents share same page layout (pageContainer, filter row, table container).

Internal Consumer API routes:

- Auth (`/api/login`, `/api/me`, `/api/logout`, `/api/signup`).
- Contacts, contracts, documents, exchange.
- Payment methods and Stripe flows.
- Payments list/history/balance/start/withdraw/transfer.
- Payment request creation and send.
- Profile, theme, and preferred-currency settings.

## Consumer CSS Grid App (Next.js)

CSS-grid consumer UI is in `apps/consumer-css-grid`, running on port 3003. `apps/api-v2` is its backend authority for the supported css-grid release surface.

Auth and routing contract:

- Same-origin BFF routes claim `appScope=consumer-css-grid` and forward the matching trusted scope/origin contract upstream.
- `CONSUMER_CSS_GRID_APP_ORIGIN` is the canonical production source of truth for BFF/auth routing.
- `NEXT_PUBLIC_APP_ORIGIN` is retained only as legacy compatibility fallback and is not the primary release contract.

## Database (Prisma)

Database schema is defined in `packages/database-2/prisma/schema.prisma`. The system uses soft-delete (`deletedAt`) on most models. Column names in the database are **snake_case** (Prisma fields use `@map("snake_case")` where needed). Financial history (ledger entries) is append-only; see `docs/FINANCIAL_SAFETY_AND_DB_COMPLIANCE.md` and `docs/postgresql-design-rules.md` for design rules.

Migration rollout note (ledger dispute uniqueness):

- Migration `20260316150500_enforce_ledger_entry_dispute_unique` prefers a non-transactional predeploy step on non-empty databases: precreate the unique index concurrently, then run the migration to attach the constraint using that index.
- For CI/ephemeral databases, the migration includes an in-transaction fallback that creates the index when missing; this path is compatibility-safe but may hold stronger locks on non-empty datasets.

### Core Models

- `AdminModel`: admin users with type (`AdminType`: `SUPER`, `ADMIN`), email, password, salt.
- `ConsumerModel`: consumer accounts, account type, admin review verification
  status, Stripe customer id, Stripe Identity lifecycle state
  (`stripe_identity_status`, active session id, last error details, lifecycle
  timestamps), and relations to profile info and transactions.
- `AccessRefreshTokenModel`: access/refresh token storage for identities.
- `OauthStateModel`: OAuth state key and payload for flow continuity.
- `ResetPasswordModel`: password reset stored as SHA-256 hash only (`token_hash`), expiration, consumer FK, and canonical `app_scope` for deterministic forgot-password verify redirects. Migrations: `20260317120000_reset_password_token_hash` (additive: add and backfill `token_hash`); `20260317120001_drop_reset_password_token` (cleanup: drop legacy `token` column); `20260406120000_reset_password_store_app_scope` (additive `app_scope` for canonical server-side routing).
- `StripeWebhookEventModel`: deduplication of Stripe webhook events by unique `event_id` (at-most-once processing).
- `AuthAuditLogModel`, `AuthLoginLockoutModel`: login audit and per-email lockout.
- `ConsumerActionLogModel`: append-only consumer action telemetry. Uses monthly partitioning by `created_at`; the primary key is intentionally `(id, created_at)` so uniqueness remains valid under partitioning rules.

### Profile and Identity Details

- `AddressDetailsModel`: address for a consumer (one-to-one).
- `PersonalDetailsModel`: personal profile details (one-to-one).
- `OrganizationDetailsModel`: organization details and role (one-to-one).
- `GoogleProfileDetailsModel`: Google OAuth profile info (one-to-one).
- `ConsumerSettingsModel`: consumer-only preferences (theme, preferred display currency; one-to-one). Preferred currency is UI default only, not used for pricing.
- `AdminSettingsModel`: admin-only preferences (theme; one-to-one).

### Payments and Ledger

- `PaymentRequestModel`: payment request between payer and requester, amount, status, rail, dates, and attachments.
- `LedgerEntryModel`: ledger entries with type, status, signed amount, fees, idempotency key, and optional payment request link. **Append-only** in application code; status transitions and dispute data are written to outcome/dispute tables; a DB trigger syncs latest outcome to `ledger_entry.status`.
- `LedgerEntryOutcomeModel`: append-only status transitions for ledger entries (AGENTS §6.10).
- `LedgerEntryDisputeModel`: append-only dispute log for Stripe disputes.
- `PaymentMethodModel`: consumer payment methods, Stripe identifiers, billing details, and card/bank metadata.
- `BillingDetailsModel`: optional billing profile for payment methods.
- `ExchangeRateModel`: currency exchange rates.
- `WalletAutoConversionRuleModel`: auto-conversion rules for consumer wallets.
- `ScheduledFxConversionModel`: scheduled FX conversions with status.

### Documents and Resources

- `ResourceModel`: file storage records (bucket/key, original name, size, access level).
- `DocumentTagModel`: tags for documents.
- `ResourceTagModel`: join table linking resources and tags.
- `PaymentRequestAttachmentModel`: join table linking resources to payment requests.
- `ConsumerResourceModel`: join table linking resources to consumers.

### Contacts

- `ContactModel`: stored contact with email, name, and address data.

### Enumerations

Enums define controlled values for:

- Accounts and roles: `AccountType`, `AdminType`, `ConsumerRole`, `ContractorKind`, `LegalStatus`, `OrganizationSize`.
- Payments and ledger: `PaymentMethodType`, `PaymentRail`, `TransactionStatus`, `TransactionType`, `TransactionFeesType`, `TransactionActionType`, `LedgerEntryType`.
- FX and currencies: `CurrencyCode`, `ExchangeRateStatus`, `ScheduledFxConversionStatus`.
- Verification and settings: `VerificationStatus`, `Theme`, `ResourceAccess`, `HowDidHearAboutUs`.

### Soft Delete and Auditing

Most models include:

- `createdAt`, `updatedAt`, `deletedAt`.
- Optional `createdBy`, `updatedBy`, `deletedBy` for transactional models.

## Packages

Shared packages used across apps:

- `packages/api-types`: shared DTOs and type exports; pagination (`PaginatedResponsePage<T>`); currency (`CURRENCY_CODES`, `CURRENCY_CODE`, `TCurrencyCode`, `getCurrencySymbol`, `isCurrencyCode`); consumer settings (theme `THEME`, preferred currency allowlist); admin payment reversal (`PAYMENT_REVERSAL_KIND`); query params (`BOOLEAN_QUERY_VALUE`).
- `packages/database-2`: Prisma schema, migrations, and generated client.
- `packages/db-fixtures`: DB fixture helpers for tests.
- `packages/security-utils`: crypto, token hashing (`hashTokenToHex` for reset-password), password hashing, and OAuth crypto utilities (PKCE verifier/challenge, state signing/hashing, nonce generation).
- `packages/shared-constants`: shared constants.
- `packages/test-db`: test database utilities.
- `packages/api-e2e`: shared Jest e2e configuration for backend test suites.
- `packages/ui`: shared UI components and `cn()` class merging via `tailwind-merge`.
- `packages/eslint-config`, `packages/jest-config`, `packages/typescript-config`: tooling.

Current env/runtime contract notes:

- Canonical frontend origin envs now live in the app-level env files and runtime consumers of those envs, not in a standalone `packages/env` workspace.
- `CONSUMER_CSS_GRID_APP_ORIGIN` and `ADMIN_APP_ORIGIN` are part of the maintained runtime contract.
- `NEXT_PUBLIC_APP_ORIGIN` remains legacy compatibility fallback only and is not the primary production release contract.

## Additional documentation

- `README.md`: root repo layout, setup, and command reference.
- `docs/PROJECT_SUMMARY.md`: concise current-state overview and doc index.
- `docs/CONSUMER_AUTH_COOKIE_POLICY.md`: canonical browser/BFF cookie contract.
- `docs/API_V2_PRODUCTION_RELEASE_GATE.md`: auth-sensitive `api-v2` release gate and required evidence.
- `docs/SWAGGER_COOKIE_AUTH_USAGE.md`: same-origin Swagger cookie-auth workflow.
- `docs/CONSUMER_AUTH_CUTOVER_RELEASE_HANDOFF.md`: release-specific handoff notes for the consumer auth cutover.
- `docs/CONSUMER_BROWSER_IDENTITY_TRACKING.md`: browser identity, `deviceId`, and consumer action-log tracking contracts.
- `docs/FINANCIAL_SAFETY_AND_DB_COMPLIANCE.md`: fintech safety, ledger invariants, idempotency, concurrency, risk audit.
- `docs/project-design-rules.md`: project design rules (dead code, boundaries, naming, migrations).
- `docs/postgresql-design-rules.md`: PostgreSQL design rules (schema, migrations, naming).
