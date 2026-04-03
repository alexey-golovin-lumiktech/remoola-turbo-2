# Remoola Project Documentation

Single-file documentation covering API, Admin, Consumer, and Database.

## Overview

Remoola is a Turborepo monorepo with:

- `apps/api`: NestJS backend (REST APIs).
- `apps/admin`: Next.js admin dashboard.
- `apps/consumer`: Next.js consumer portal.
- `apps/consumer-mobile`: Next.js mobile-first consumer app (port 3002).
- `packages/database-2`: Prisma schema, migrations, and generated client.
- Shared packages for types, UI, linting, and TS config.

## API (NestJS) - Implemented Features

Base backend lives in `apps/api`. All API routes use the global prefix `/api` (e.g. `/api/admin/auth`, `/api/consumer/auth`). Auth on the Nest API is namespaced under `admin` and `consumer` only; shared JWT wiring lives under `apps/api/src/auth` (`JwtPassportModule`, `JwtStrategy`) but does not expose a root `/api/auth` route. The Admin Next.js app may still use BFF paths like `/api/auth/login` that proxy to `/api/admin/auth` on the backend.

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
- `GET /signup/verification`: verify account by token. Verification email links omit
  `email` query params; successful redirects to the consumer verification page may
  still include `email` for compatibility/UX.
- Forgot-password and reset (no auth required): `POST /forgot-password` (email; requires valid `Origin` header — must be an allowed consumer origin, else 400 `ORIGIN_REQUIRED`); `GET /forgot-password/verify?token=…&referer=…` — validate token and redirect to app; `POST /password/reset` (body: token, password) — set new password with token from email.
- Authenticated password update: `PATCH /consumer/profile/password` (see Profile below). This route supports both password change and first-time password creation for Google-only / no-password accounts.
- Google OAuth flows:
  - `GET /google/start`: start OAuth flow. Accepts optional `returnOrigin` query parameter to specify the consumer app origin (validated against CORS_ALLOWED_ORIGINS via `OriginResolverService`) for redirect after authentication. Useful for multi-app deployments (e.g., desktop consumer on port 3001, mobile consumer on port 3002). Supports CONSUMER_APP_ORIGIN, CONSUMER_MOBILE_APP_ORIGIN, and ADMIN_APP_ORIGIN.
  - `GET /google/callback`: OAuth redirect handling; uses stored `returnOrigin` from state.
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
- `POST /:paymentRequestId/send`: send payment request.

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

Common infrastructure in `apps/api/src/shared` and `apps/api/src/shared-common`:

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
- `OriginResolverService`: centralized origin validation for OAuth flows (CONSUMER_APP_ORIGIN, CONSUMER_MOBILE_APP_ORIGIN, ADMIN_APP_ORIGIN).

Recent runtime hardening (API pipeline and scheduler safety):

- Global request pipeline wiring in `apps/api/src/main.ts` now explicitly includes:
  - `CorrelationIdMiddleware` (normalizes/sets `x-correlation-id`),
  - `deviceIdMiddleware` (consumer-path browser identity resolution),
  - `ConsumerActionInterceptor` (decorator-gated append-only action logging).
- `StripeReversalScheduler` in both `apps/api/src/consumer/modules/payment-methods/stripe-reversal.scheduler.ts` and `apps/api-v2/src/consumer/modules/payment-methods/stripe-reversal.scheduler.ts` uses transaction-scoped advisory lock selection and bounded per-run reconciliation to reduce pooled-connection lock hazards while preserving idempotent outcome writes.
- `StripeWebhookService.processStripeEvent` top-level failure path logs sanitized warning telemetry (`stripe_webhook_processing_failed`) without exposing raw webhook payload/error text in logs.
- Consumer and consumer-mobile BFF mutation routes preserve idempotency/correlation header forwarding and backend `Set-Cookie` passthrough behavior for auth/payment compatibility.

Consumer/browser tracking reference:

- `docs/CONSUMER_BROWSER_IDENTITY_TRACKING.md`: browser identity (`deviceId`), action tracking (`@TrackConsumerAction` + interceptor), append-only `consumer_action_log`, compatibility contracts, and verification checklist.
- OAuth state-cookie compatibility fallback (`CONSUMER_OAUTH_ALLOW_MISSING_STATE_COOKIE_FALLBACK`) is restricted to development/test only; startup/runtime block it in staging/production.

## Admin App (Next.js)

Admin UI is in `apps/admin`. It has server routes and internal API handlers under `apps/admin/src/app/api` to communicate with the backend.

Implemented screens:

- `/(auth)/login`: admin login flow.
- `/(protected)/dashboard`: dashboard metrics and queues.
- `/(protected)/admins`: admin list and admin details pages.
- `/(protected)/consumers`: consumer list and consumer details pages.
- `/(protected)/payment-requests`: list, details, and expectation-date archive.
- `/(protected)/payment-requests/expectation-date-archive`: expectation-date archive view.
- `/(protected)/ledger`: ledger listing and ledger anomalies view.
- `/(protected)/exchange/rules`: review auto-conversion rules.
- `/(protected)/exchange/scheduled`: review scheduled FX conversions.
- `/(protected)/exchange/rates`: manage exchange rates.
- `/(protected)/ledger/anomalies`: dedicated ledger anomalies view.

Dashboard widgets in `apps/admin/src/components/dashboard`:

- Status totals and recent payment requests.
- Ledger anomalies and verification queue.

Internal Admin API routes (server-side):

- Auth routes (`/api/auth/*`) for login/logout/me.
- Admin management routes (`/api/admins/*`).
- Consumer management routes (`/api/consumers/*`, including verification updates).
- Dashboard data routes (`/api/dashboard/*`).
- Ledger and payment request data routes (`/api/ledger`, `/api/payment-requests/*`, `/api/payment-requests/expectation-date-archive`).
- Exchange routes (`/api/exchange/*`).

## Consumer App (Next.js)

Consumer UI is in `apps/consumer`, with internal API handlers in `apps/consumer/src/app/api` to call the backend.

Recent consumer UX updates:

- The authenticated shell now includes a command palette for pages and primary actions. Users can open it from the header search affordance or via `Cmd+K` on Apple platforms and `Ctrl+/` on Linux/Windows.
- Mobile navigation keeps a compact bottom bar for Home, Payments, Contacts, and Contracts, while secondary destinations move into a `More` drawer.
- Desktop navigation labels were polished to better match product language, including `Bank & Cards`, `Withdraw`, and `Exchange`.
- Theme resolution is applied before paint in the root layout so light/dark preference is visible earlier and hydration mismatch risk is reduced.
- Signup and profile entry points now use stricter date parsing, clearer verification/completion copy, country-aware passport/ID hints, broader address parsing across US/Canada/UK/Russia/Germany formats, and `countryHint` support for ambiguous address prefill inputs.
- Settings now distinguish `Set Password` from `Change Password`: accounts with `hasPassword === false` can create a first password without entering a current password, then are redirected through `auth_notice=password_set` to sign in again.

## Consumer Mobile App (Next.js)

Mobile-first consumer UI is in `apps/consumer-mobile`, running on port 3002. Follows the same architecture as the desktop consumer app with mobile-optimized layouts and enhanced touch interactions. Uses Google OAuth with `returnOrigin` parameter for proper redirect handling in multi-app deployments.

Recent hardening and architecture updates:

- Styling migrated to CSS Modules across routes/features/shared UI (`*.module.css`) to keep presentation separated from TSX logic.
- Login `next` query handling is sanitized (unsafe absolute/protocol-relative/malformed/CRLF values are rejected and fallback to `/dashboard`).
- Middleware refresh flow emits `x-remoola-auth-refresh-*` headers and `server-timing` metrics for refresh observability and avoids auth-page redirect loops with expired cookies.
- Settings mirrors consumer web password behavior: `hasPassword` controls whether the form is `Set Password` or `Change Password`, current-password validation is conditional, and success can redirect via `auth_notice=password_set`.

### Enhanced UI Features

- **Documents View**: Card-based responsive grid layout (1/2/3 columns), filter chips with counts, skeleton loading states, improved empty states
- **Touch-Optimized**: 44px minimum touch targets, swipe gestures, smooth animations
- **Visual Polish**: Gradients, shadows, backdrop blur effects, improved spacing and typography
- **Responsive Design**: Sticky headers with backdrop blur, mobile-first layouts that scale to desktop

### Shared UI Library (`apps/consumer-mobile/src/shared/ui`)

- **ConfirmationModal**: Reusable confirmation dialog (moved from documents feature); supports title, message, confirm/cancel labels, danger variant, optional error text.
- **Shared components**: AlertBanner, FilterChip, IconButton, NavCard, PaginationButton, SegmentedButton, form-classes; EmailNotInContactsModal for payment flows.
- **Icon Library** (`icons/`): 49 SVG icon components with unified `IconProps` interface:
  - Navigation & Actions: ArrowDown, ArrowRight, ArrowUp, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Home, Plus, Refresh, Search, X
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
- `ResetPasswordModel`: password reset stored as SHA-256 hash only (`token_hash`), expiration, consumer FK. Migrations: `20260317120000_reset_password_token_hash` (additive: add and backfill `token_hash`); `20260317120001_drop_reset_password_token` (cleanup: drop legacy `token` column).
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
- `packages/env`: runtime env schema and validation (Zod). Includes CONSUMER_APP_ORIGIN, CONSUMER_MOBILE_APP_ORIGIN, and ADMIN_APP_ORIGIN.
- `packages/security-utils`: crypto, token hashing (`hashTokenToHex` for reset-password), password hashing, and OAuth crypto utilities (PKCE verifier/challenge, state signing/hashing, nonce generation).
- `packages/shared-constants`: shared constants.
- `packages/test-db`: test database utilities.
- `packages/ui`: shared UI components and `cn()` class merging via `tailwind-merge`.
- `packages/eslint-config`, `packages/jest-config`, `packages/typescript-config`: tooling.

## Additional documentation

- `docs/FINANCIAL_SAFETY_AND_DB_COMPLIANCE.md`: fintech safety, ledger invariants, idempotency, concurrency, risk audit.
- `docs/project-design-rules.md`: project design rules (dead code, boundaries, naming, migrations).
- `docs/postgresql-design-rules.md`: PostgreSQL design rules (schema, migrations, naming).
