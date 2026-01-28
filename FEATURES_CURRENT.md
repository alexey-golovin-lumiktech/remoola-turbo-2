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
- Google OAuth endpoints for consumer login flows.

Consumer domain features:
- Dashboard aggregation endpoint.
- Contacts CRUD and contact details.
- Contracts listing.
- Document upload, tagging, and attachment to payments.
- Exchange rates, currency conversion, auto-conversion rules, scheduled FX conversions, and admin review/override.
- Payment methods CRUD (manual) and Stripe payment method metadata lookup.
- Stripe checkout sessions, setup intents, confirmations, saved-method payments.
- Stripe webhooks, including identity verification start.
- Payments list, balance, history, start payment, withdraw, transfer, and payment view.
- Payment request creation and send flow.
- Profile management (personal, address, organization) and password change.
- User settings for theme preference.
- Invoice generation for payment requests.

Admin domain features:
- Admin management (list, details, password change, delete/restore with SUPER guard).
- Consumer management (list/details) and verification workflow (approve/reject/flag/more info).
- Dashboard metrics: status totals, recent payment requests, ledger anomalies, verification queue.
- Ledger list endpoint.
- Payment requests listing and details.
- Admin-side migration endpoint for payment method migration.

Infrastructure and platform:
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
- Payment request list and details views.
- Ledger list view and anomalies view.
- Theme switching (light/dark/system) using CSS custom properties.

Internal API proxy routes:
- Admin auth proxy: login/logout/me.
- Admin management proxy.
- Consumer management and verification proxy.
- Dashboard proxy endpoints.
- Ledger and payment requests proxy endpoints.

### Consumer App (Next.js)

Consumer UI with:
- Login, logout, OAuth callback, and signup flow (multi-step).
- Dashboard with summaries, tasks, and activity.
- Contacts list, create/edit/delete, and detail pages.
- Contracts list.
- Documents upload, list, tagging, and attach-to-payment flow.
- Exchange screen with rates, balances, and conversion.
- Payment methods management, including Stripe setup flows.
- Payment requests creation and send flow.
- Payments list, details, start payment, transfer, withdraw, and invoice generation.
- Profile settings (personal, address, organization, password).
- Theme settings (light/dark/system).

Internal API proxy routes:
- Auth, signup, profile, settings.
- Contacts, contracts, documents, exchange.
- Payments, payment requests, payment methods, Stripe flows.

### Database (Prisma)

Key data models and relations:
- Admins, consumers, access/refresh tokens, password reset tokens.
- Consumer profile details (address, personal, organization, Google profile).
- User settings (theme).
- Payment requests, payment request attachments, ledger entries.
- Payment methods with Stripe identities and billing details.
- Exchange rates and currency support.
- Contacts.
- Documents/resources with tagging and access control.

Ledger and payments:
- Signed ledger entries with idempotency key for exactly-once processing.
- Payment rails, statuses, and fee handling enums.
- Soft-delete strategy (deletedAt) with uniqueness scoped to non-deleted rows.

## Comparison Notes (History vs Current State)

Confirmed as present in current code:
- Payment requests flow, payments, wallet/transfer/withdraw.
- Exchange rates and conversion.
- Stripe payment methods, setup intents, webhooks, and identity verification start.
- Consumer profile management and signup flow.
- Admin dashboard metrics, verification workflow, and ledger access.
- Theme switching for consumer and admin apps.
- Health checks, security headers, rate limiting, logging.

Historical items not active as a standalone feature now:
- A past "admin app Vercel deployment config" commit was explicitly reverted.
- Earlier admin SWR-based architecture was replaced with direct API proxy routes.
