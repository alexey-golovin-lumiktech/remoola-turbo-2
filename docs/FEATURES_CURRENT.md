# Current Implemented Features

List of features that are implemented and present in the repo now.

## Sources Used

- Current backend modules, controllers, and routes under `apps/api`.
- Current admin and consumer apps under `apps/admin` and `apps/consumer`.
- Current database schema at `packages/database-2/prisma/schema.prisma`.

## Implemented and Working Now

### Backend (API)

Authentication and identity:

- Admin auth with login, refresh, logout, and `/me` identity.
- Consumer auth with login, refresh, logout, `/me`, and multi-step signup.
- Password recovery and reset flow for consumers.
- Cookie-based JWT auth with access/refresh tokens.
- Login audit (success/failure tracking) and account lockout (per-email after N failures).
- Google OAuth endpoints for consumer login flows (google/start, callback, signup-session, google-new-way, google-redirect-new-way, oauth/exchange, google-oauth, google-login-gpt).

Consumer domain features:

- Dashboard aggregation endpoint.
- Contacts CRUD and contact details (list paginated: page, pageSize).
- Contracts listing (paginated).
- Document upload, tagging, and attachment to payments (documents list paginated).
- Exchange rates, currency conversion, auto-conversion rules, scheduled FX conversions (rules and scheduled lists paginated), and admin review/override.
- Payment methods CRUD (manual) and Stripe payment method metadata lookup.
- Stripe checkout sessions, setup intents, confirmations, saved-method payments.
- Stripe webhooks, including identity verification start; verify/start requires
  profile complete (legal status, tax ID, passport/ID or phone per account type)
  and returns PROFILE_INCOMPLETE_VERIFY when incomplete.
- Payments list, balance, history, start payment, withdraw, transfer, and payment view.
- Payment request creation and send flow.
- Profile management (personal, address, organization) and password change.
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

- Root auth module at `/auth` (login, register, logout, me) in addition to admin/consumer namespaced auth.
- Health endpoints (`/health`, `/health/detailed`) for service and DB checks.
- CORS configuration and security headers (Helmet).
- Rate limiting and response compression.
- Structured request logging with correlation IDs.
- Prisma-based data access and error handling.
- Swagger documentation for API endpoints and DTOs.

### Admin App (Next.js)

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

- Admin auth proxy: login/logout/me.
- Admin management proxy.
- Consumer management and verification proxy.
- Dashboard proxy endpoints.
- Ledger and payment requests proxy endpoints (including expectation-date-archive).
- Payment request refund/chargeback proxy endpoints.
- Exchange rate management and currency list proxy endpoints.
- Audit proxy: GET `/api/audit/auth`, GET `/api/audit/actions`.

### Consumer App (Next.js)

Consumer UI with:

- Login, logout, OAuth callback, and signup flow (multi-step); auth refresh and session-expired handling.
- Signup start and completion confirmation pages.
- Dashboard with summaries, tasks, and activity; “Verify Me” vs “Complete your
  profile” (link to settings) based on profile-complete task from API.
- Contacts list (paginated, layout aligned with Documents), create/edit/delete, and detail pages.
- Contracts list (paginated).
- Documents upload, list (paginated), tagging, and attach-to-payment flow.
- Exchange screen with rates, balances, and conversion; currency options from api-types (CURRENCY_CODES).
- Payment methods management, including Stripe setup flows.
- Payment requests creation and send flow.
- Payments list (paginated, filters), details, start payment, transfer, withdraw, and invoice generation.
- Profile settings (personal, address, organization, password).
- Theme and preferred currency settings (light/dark/system; currency from api-types allowlist).
- Shared UI: PaginationBar (Showing X–Y of Z, Previous/Next), AmountCurrencyInput, RecipientEmailField; form controls 42px/rounded-lg; Contacts and Documents pages share same layout pattern.

Internal API proxy routes:

- Auth (including refresh), signup, profile, settings (theme, preferred-currency).
- Contacts, contracts, documents, exchange (query params forwarded, including page/pageSize).
- Payments, payment requests, payment methods, Stripe flows.
- OAuth exchange proxy endpoint.
- Exchange quote and batch rate proxy endpoints.

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
- Database column naming: snake_case in schema (Prisma fields use `@map("snake_case")` where needed).

Shared packages present in repo:

- `api-types`: shared DTOs, PaginatedResponsePage, currency (CURRENCY_CODES, TCurrencyCode, getCurrencySymbol), consumer settings (theme THEME, preferred currency allowlist), admin payment reversal (PAYMENT_REVERSAL_KIND), query params (BOOLEAN_QUERY_VALUE).
- `database-2`, `db-fixtures`, `env`, `eslint-config`, `jest-config`, `security-utils`, `shared-constants`, `test-db`, `typescript-config`, `ui`.

Infrastructure and testing:

- Root `yarn test` and `yarn test:e2e` are gated by `scripts/ensure-local-development.js`: they run only in local development and are blocked in CI and on Vercel to avoid accidental production/CI DB usage.
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
