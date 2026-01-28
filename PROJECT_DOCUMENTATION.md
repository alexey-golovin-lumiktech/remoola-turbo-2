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

Base backend lives in `apps/api`. The implemented features are organized under `admin` and `consumer` namespaces.

### Admin APIs

Auth (`/admin/auth`):
- `POST /login`: authenticate admin; sets access/refresh cookies.
- `POST /refresh-access`: refresh access token.
- `POST /logout`: clear auth cookies.
- `GET /me`: current admin identity.

Admins (`/admin/admins`):
- `GET /`: list admins.
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
- `GET /:id`: payment request details.

Exchange (`/admin/exchange`):
- `GET /rules`: list auto-conversion rules across consumers.
- `PATCH /rules/:ruleId`: update/override a rule.
- `POST /rules/:ruleId/run`: force-run a rule immediately.
- `GET /scheduled`: list scheduled FX conversions.
- `POST /scheduled/:conversionId/cancel`: cancel a scheduled conversion.
- `POST /scheduled/:conversionId/execute`: force-execute a scheduled conversion.

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
  - `GET /google-new-way`: start new OAuth flow.
  - `GET /google-redirect-new-way`: OAuth redirect handling.
  - `POST /google-oauth`: legacy Google OAuth login.
  - `POST /google-login-gpt`: alternate OAuth flow.

Dashboard (`/consumer/dashboard`):
- `GET /`: aggregated dashboard data for consumer.

Contacts (`/consumer/contacts`):
- `GET /`: list contacts.
- `POST /`: create contact.
- `PATCH /:id`: update contact.
- `DELETE /:id`: delete contact.
- `GET /:id/details`: full contact details.

Contracts (`/consumer/contracts`):
- `GET /`: list contracts for consumer.

Documents (`/consumer/documents`):
- `GET /`: list documents (optional kind filter).
- `POST /upload`: upload multiple documents.
- `POST /bulk-delete`: delete multiple documents.
- `POST /attach-to-payment`: attach documents to payment requests.
- `POST /:id/tags`: set document tags.

Exchange (`/consumer/exchange`):
- `GET /rates`: get FX rate for currency pair.
- `POST /convert`: currency conversion (consumer context).
- `GET /rules`: list auto-conversion rules.
- `POST /rules`: create auto-conversion rule.
- `PATCH /rules/:ruleId`: update auto-conversion rule.
- `DELETE /rules/:ruleId`: delete auto-conversion rule.
- `GET /scheduled`: list scheduled FX conversions.
- `POST /scheduled`: create scheduled FX conversion.
- `POST /scheduled/:conversionId/cancel`: cancel scheduled conversion.
- `GET /currencies`: list supported currency codes.

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
- `/(protected)/payment-requests`: list and details.
- `/(protected)/ledger`: ledger listing and ledger anomalies view.
- `/(protected)/exchange/rules`: review auto-conversion rules.
- `/(protected)/exchange/scheduled`: review scheduled FX conversions.

Dashboard widgets in `apps/admin/src/components/dashboard`:
- Status totals and recent payment requests.
- Ledger anomalies and verification queue.

Internal Admin API routes (server-side):
- Auth routes (`/api/auth/*`) for login/logout/me.
- Admin management routes (`/api/admins/*`).
- Consumer management routes (`/api/consumers/*`, including verification updates).
- Dashboard data routes (`/api/dashboard/*`).
- Ledger and payment request data routes (`/api/ledger`, `/api/payment-requests/*`).
- Exchange routes (`/api/exchange/*`).

## Consumer App (Next.js)

Consumer UI is in `apps/consumer`, with internal API handlers in `apps/consumer/src/app/api` to call the backend.

Auth and onboarding:
- `/login`: login form.
- `/logout`: logout route.
- `/auth/callback`: OAuth callback handling.
- `/signup`: multi-step signup flow with address, personal, organization details.
- `/signup/start/contractor-kind`: contractor kind selection.
- `/signup/verification` and `/signup/completed`: verification and completion states.

Main shell routes:
- `/dashboard`: consumer dashboard with summaries and tasks.
- `/contacts`: list and manage contacts, contact details view.
- `/contracts`: contract list.
- `/documents`: documents list, upload, tags, attach to payments.
- `/exchange`: currency exchange, balances, rates.
- `/exchange/rules`: manage auto-conversion rules.
- `/exchange/scheduled`: manage scheduled FX conversions.
- `/payment-methods`: manage saved payment methods.
- `/payment-requests/new`: create new payment request.
- `/payments`: list payments and filters.
- `/payments/[paymentRequestId]`: payment details view.
- `/payments/start`: start a payment flow.
- `/withdraw-transfer`: withdraw and transfer forms.
- `/settings`: profile, address, organization, password, and theme settings.

Internal Consumer API routes:
- Auth (`/api/login`, `/api/me`, `/api/logout`, `/api/signup`).
- Contacts, contracts, documents, exchange.
- Payment methods and Stripe flows.
- Payments list/history/balance/start/withdraw/transfer.
- Payment request creation and send.
- Profile and theme settings.

## Database (Prisma)

Database schema is defined in `packages/database-2/prisma/schema.prisma`. The system uses soft-delete (`deletedAt`) on most models.

### Core Models

- `AdminModel`: admin users with role (`SUPER`, `ADMIN`), email, password, salt.
- `ConsumerModel`: consumer accounts, account type, verification status, Stripe customer id, and relations to profile info and transactions.
- `AccessRefreshTokenModel`: access/refresh token storage for identities.
- `ResetPasswordModel`: password reset token and expiration.

### Profile and Identity Details

- `AddressDetailsModel`: address for a consumer (one-to-one).
- `PersonalDetailsModel`: personal profile details (one-to-one).
- `OrganizationDetailsModel`: organization details and role (one-to-one).
- `GoogleProfileDetailsModel`: Google OAuth profile info (one-to-one).
- `UserSettingsModel`: theme settings (one-to-one).

### Payments and Ledger

- `PaymentRequestModel`: payment request between payer and requester, amount, status, rail, dates, and attachments.
- `LedgerEntryModel`: ledger entries with type, status, signed amount, fees, idempotency key, and optional payment request link.
- `PaymentMethodModel`: consumer payment methods, Stripe identifiers, billing details, and card/bank metadata.
- `BillingDetailsModel`: optional billing profile for payment methods.
- `ExchangeRateModel`: currency exchange rates.

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
- Payments and ledger: `PaymentMethodType`, `PaymentRail`, `TransactionStatus`, `TransactionType`, `TransactionFeesType`, `LedgerEntryType`.
- FX and currencies: `CurrencyCode`.
- Verification and settings: `VerificationStatus`, `Theme`, `ResourceAccess`, `HowDidHearAboutUs`.

### Soft Delete and Auditing

Most models include:
- `createdAt`, `updatedAt`, `deletedAt`.
- Optional `createdBy`, `updatedBy`, `deletedBy` for transactional models.

## Packages

Shared packages used across apps:
- `packages/api-types`: shared DTOs and type exports.
- `packages/database-2`: Prisma schema, migrations, and generated client.
- `packages/env`: runtime env schema and types.
- `packages/ui`: shared UI components.
- `packages/eslint-config`, `packages/jest-config`, `packages/typescript-config`: tooling.
