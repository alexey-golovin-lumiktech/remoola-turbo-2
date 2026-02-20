# Remoola Project Documentation

Single-file documentation covering API, Admin, Consumer, and Database.

## Overview

Remoola is a Turborepo monorepo with:

- `apps/api`: NestJS backend (REST APIs).
- `apps/admin`: Next.js admin dashboard.
- `apps/consumer`: Next.js consumer portal.
- `packages/database-2`: Prisma schema, migrations, and generated client.
- Shared packages for types, UI, linting, and TS config.

## API (NestJS) - Implemented Features

Base backend lives in `apps/api`. The implemented features are organized under `admin` and `consumer` namespaces. A root `auth` module also exists (login, register, logout, me) at `/auth`.

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
- `POST /refresh-access`: refresh access token.
- `GET /me`: current consumer identity.
- `POST /signup`: create consumer account.
- `GET /signup/:consumerId/complete-profile-creation`: finalize profile and send verification email.
- `GET /signup/verification`: verify account by token.
- `POST /change-password`: request password recovery email.
- `PATCH /change-password/:token`: reset password by token.
- Google OAuth flows:
  - `GET /google/start`: start new OAuth flow.
  - `GET /google/callback`: OAuth redirect handling.
  - `GET /google/signup-session`: fetch OAuth signup session data.
  - `GET /google-new-way`, `GET /google-redirect-new-way`: alternate OAuth entry/redirect.
  - `POST /oauth/exchange`: exchange OAuth code for access/refresh tokens.
  - `POST /google-oauth`: legacy Google OAuth login.
  - `POST /google-login-gpt`: alternate OAuth flow.

Dashboard (`/consumer/dashboard`):

- `GET /`: aggregated dashboard data for consumer.

Contacts (`/consumer/contacts`):

- `GET /`: list contacts (query: `page`, `pageSize`; response: `items`, `total`, `page`, `pageSize`).
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
- `GET /currencies`: list supported currency codes (aligned with api-types `ALL_CURRENCY_CODES`).

Payment Methods (`/consumer/payment-methods`):

- `GET /`: list saved payment methods.
- `POST /`: create manual payment method.
- `PATCH /:id`: update payment method.
- `DELETE /:id`: delete payment method.

Stripe (`/consumer/stripe`):

- `POST /:paymentRequestId/stripe-session`: create checkout session for a payment request.
- `POST /intents`: create setup intent.
- `POST /confirm`: confirm setup intent.
- `POST /payment-method/metadata`: fetch card or bank metadata.
- `POST /:paymentRequestId/pay-with-saved-method`: charge using saved method.

Webhooks (`/consumer/webhooks`):

- `POST /`: Stripe webhook handler.
- `POST /stripe/verify/start`: start Stripe identity verification.

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

- `GET /me`: get profile details.
- `PATCH /update`: update profile details.
- `PATCH /password`: change password.

Settings (`/consumer/settings`):

- `GET /theme`: get theme settings.
- `PUT /theme`: update theme settings.
- `GET /preferred-currency`: get preferred display currency.
- `PUT /preferred-currency`: update preferred display currency (allowlist in api-types).

### Shared Backend Capabilities

Common infrastructure in `apps/api/src/shared` and `apps/api/src/shared-common`:

- Prisma DB module and service.
- Email templates and mailing service.
- JWT auth guard and interceptors.
- Error filtering and logging.
- Common DTOs used across admin and consumer APIs.

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

Auth and onboarding:

- `/login`: login form.
- `/logout`: logout route.
- `/auth/callback`: OAuth callback handling.
- `/signup`: multi-step signup flow with address, personal, organization details.
- `/signup/start`: account type selection step.
- `/signup/start/contractor-kind`: contractor kind selection.
- `/signup/verification` and `/signup/completed`: verification and completion states.

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
- `/settings`: profile, address, organization, password, theme, and preferred currency settings.

Consumer UI shared patterns: pagination bar (Showing X–Y of Z, Previous/Next) on list tables; amount+currency input and recipient email field components; form controls 42px height and rounded-lg; Contacts and Documents share same page layout (pageContainer, filter row, table container).

Internal Consumer API routes:

- Auth (`/api/login`, `/api/me`, `/api/logout`, `/api/signup`).
- Contacts, contracts, documents, exchange.
- Payment methods and Stripe flows.
- Payments list/history/balance/start/withdraw/transfer.
- Payment request creation and send.
- Profile, theme, and preferred-currency settings.

## Database (Prisma)

Database schema is defined in `packages/database-2/prisma/schema.prisma`. The system uses soft-delete (`deletedAt`) on most models.

### Core Models

- `AdminModel`: admin users with role (`SUPER`, `ADMIN`), email, password, salt.
- `ConsumerModel`: consumer accounts, account type, verification status, Stripe customer id, and relations to profile info and transactions.
- `AccessRefreshTokenModel`: access/refresh token storage for identities.
- `OauthStateModel`: OAuth state key and payload for flow continuity.
- `ResetPasswordModel`: password reset token and expiration.

### Profile and Identity Details

- `AddressDetailsModel`: address for a consumer (one-to-one).
- `PersonalDetailsModel`: personal profile details (one-to-one).
- `OrganizationDetailsModel`: organization details and role (one-to-one).
- `GoogleProfileDetailsModel`: Google OAuth profile info (one-to-one).
- `ConsumerSettingsModel`: consumer-only preferences (theme, preferred display currency; one-to-one). Preferred currency is UI default only, not used for pricing.
- `AdminSettingsModel`: admin-only preferences (theme; one-to-one).

### Payments and Ledger

- `PaymentRequestModel`: payment request between payer and requester, amount, status, rail, dates, and attachments.
- `LedgerEntryModel`: ledger entries with type, status, signed amount, fees, idempotency key, and optional payment request link.
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

- `packages/api-types`: shared DTOs and type exports; pagination (`PaginatedResponsePage<T>`); currency (`ALL_CURRENCY_CODES`, `TCurrencyCode`, `getCurrencySymbol`); consumer settings (e.g. preferred currency allowlist).
- `packages/database-2`: Prisma schema, migrations, and generated client.
- `packages/db-fixtures`: DB fixture helpers for tests.
- `packages/env`: runtime env schema and validation (Zod).
- `packages/security-utils`: crypto, token, and hashing helpers.
- `packages/shared-constants`: shared constants.
- `packages/test-db`: test database utilities.
- `packages/ui`: shared UI components.
- `packages/eslint-config`, `packages/jest-config`, `packages/typescript-config`: tooling.
