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
- Google OAuth endpoints for consumer login flows (google/start, callback, signup-session, google-new-way, google-redirect-new-way, oauth/exchange, google-oauth, google-login-gpt).

Consumer domain features:

- Dashboard aggregation endpoint.
- Contacts CRUD and contact details (list paginated: page, pageSize).
- Contracts listing (paginated).
- Document upload, tagging, and attachment to payments (documents list paginated).
- Exchange rates, currency conversion, auto-conversion rules, scheduled FX conversions (rules and scheduled lists paginated), and admin review/override.
- Payment methods CRUD (manual) and Stripe payment method metadata lookup.
- Stripe checkout sessions, setup intents, confirmations, saved-method payments.
- Stripe webhooks, including identity verification start.
- Payments list, balance, history, start payment, withdraw, transfer, and payment view.
- Payment request creation and send flow.
- Profile management (personal, address, organization) and password change.
- User settings for theme preference and preferred display currency (api-types allowlist).
- Invoice generation for payment requests.

Admin domain features:

- Admin management (list, create, details, password change, delete/restore with SUPER guard).
- Consumer management (list/details) and verification workflow (approve/reject/flag/more info).
- Dashboard metrics: status totals, recent payment requests, ledger anomalies, verification queue.
- Ledger list endpoint.
- Payment requests listing, expectation-date archive, details, plus refund and chargeback actions.
- Admin-side migration endpoint for payment method migration.
- Exchange rate management (list/create/update/delete) and supported currencies.

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

- Login flow and authenticated protected sections.
- Dashboard with metrics, verification queue, recent payment requests, and ledger anomalies.
- Admin management pages (list and details).
- Consumer management pages (list and details + verification actions).
- Payment request list, details, and expectation-date archive views.
- Ledger list view and anomalies view.
- Exchange rate management pages (list, create, edit, delete).
- Theme switching (light/dark/system) using CSS custom properties.

Internal API proxy routes:

- Admin auth proxy: login/logout/me.
- Admin management proxy.
- Consumer management and verification proxy.
- Dashboard proxy endpoints.
- Ledger and payment requests proxy endpoints (including expectation-date-archive).
- Payment request refund/chargeback proxy endpoints.
- Exchange rate management and currency list proxy endpoints.

### Consumer App (Next.js)

Consumer UI with:

- Login, logout, OAuth callback, and signup flow (multi-step); auth refresh and session-expired handling.
- Signup start and completion confirmation pages.
- Dashboard with summaries, tasks, and activity.
- Contacts list (paginated, layout aligned with Documents), create/edit/delete, and detail pages.
- Contracts list (paginated).
- Documents upload, list (paginated), tagging, and attach-to-payment flow.
- Exchange screen with rates, balances, and conversion; currency options from api-types (ALL_CURRENCY_CODES).
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

- Admins, consumers, access/refresh tokens, OAuth state, password reset tokens.
- Consumer profile details (address, personal, organization, Google profile).
- User settings (theme).
- Payment requests, payment request attachments, ledger entries.
- Payment methods with Stripe identities and billing details.
- Exchange rates, wallet auto-conversion rules, scheduled FX conversions.
- Contacts.
- Documents/resources with tagging and access control.

Ledger and payments:

- Signed ledger entries with idempotency key for exactly-once processing.
- Payment rails, statuses, fee handling, and enums (including ExchangeRateStatus, TransactionActionType, ScheduledFxConversionStatus).
- Soft-delete strategy (deletedAt) with uniqueness scoped to non-deleted rows.

Shared packages present in repo:

- `api-types`: shared DTOs, PaginatedResponsePage, currency (ALL_CURRENCY_CODES, TCurrencyCode, getCurrencySymbol), consumer settings (e.g. preferred currency allowlist).
- `database-2`, `db-fixtures`, `env`, `eslint-config`, `jest-config`, `security-utils`, `shared-constants`, `test-db`, `typescript-config`, `ui`.

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
