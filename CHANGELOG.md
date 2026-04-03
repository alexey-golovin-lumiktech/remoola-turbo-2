# Changelog

- [September 2025](#changelog-september-2025) · [October 2025](#changelog-october-2025) · [November 2025](#changelog-november-2025) · [December 2025](#changelog-december-2025) · [January 2026](#changelog-january-2026) · [February 2026](#changelog-february-2026) · [March 2026](#changelog-march-2026) · [April 2026](#changelog-april-2026)

---

<details>
<summary><strong>Changelog (September 2025)</strong></summary>

# Changelog (September 2025)

- **2025-09-01:** Initial analysis of the 3 separate repositories.

- **2025-09-02:** Created new Turborepo structure with `apps/` and `packages/`.
                    Added base `turbo.json`.

- **2025-09-03:** Migrated first repository (`backend-nestjs`) into `apps/backend`.
                    Verified build.

- **2025-09-04:** Migrated second repository (`frontend-nextjs`) into `apps/frontend`.
                    Fixed ESLint/TS issues.

- **2025-09-05:** Migrated shared library repo into `packages/ui` and `packages/utils`.
                    Linked via workspaces.

- **2025-09-08:** Integrated NestJS modules from old repos into monorepo.

- **2025-09-09:** Fixed TypeORM migrations (UUID migration, FK adjustments).

- **2025-09-10:** Standardized DTOs, validation decorators.

- **2025-09-11:** Integrated shared utils/UI libs into Next.js frontend.

- **2025-09-12:** Fixed aliasing issues (`@/utils`, `@/ui`), standardized API client
                    with OpenAPI.

- **2025-09-15:** Start implementing **role-based management** system,
                    allowing **super admin to assign and manage admin roles**.
                    Defined DB schema changes and initial service structure.

- **2025-09-16:** Continued development of role-based management.

- **2025-09-17:** Continued development of role-based management.

- **2025-09-18:** Removed legacy configs from old repos, cleaned unused files.

- **2025-09-19:** Added Husky + lint-staged for pre-commit checks.

- **2025-09-22:** Fixed path alias issues and Webpack/Turbo config.

- **2025-09-23:** Standardized API client usage with OpenAPI-generated types.

- **2025-09-24:** Fixed mismatched dependencies (React versions, NestJS peer deps).

- **2025-09-25:** Continued development of role-based management.

- **2025-09-26:** Continued development of role-based management.

- **2025-09-29:** Continued development of role-based management.

- **2025-09-30:** Continued development of role-based management.

</details>

---

<details>
<summary><strong>Changelog (October 2025)</strong></summary>

# Changelog (October 2025)

- **2025-10-02:** Increased monorepo stability; fixed module import issues
                    and improved concurrent dev experience.

- **2025-10-03:** Implemented role-based access control:
                    superadmins manage admins/clients, admins manage clients only.

- **2025-10-06:** Added unified global search service across entities
                    with optimized SQL and simplified payloads.

- **2025-10-07:** Introduced `v1` versioned routing for admin and consumer APIs,
                    reorganized module structure.

- **2025-10-08:** Implemented `/v1/admin/clients/:clientId` backend endpoints
                    for detailed client lookup.

- **2025-10-09:** Upgraded OpenAPI spec to `v1` with enhanced schemas
                    and versioned endpoints.

- **2025-10-10:** Standardized all admin routes under `/admin/admins`.

- **2025-10-13:** Unified API documentation and Swagger with version switching;
                    improved visibility across all modules.

- **2025-10-14:** Split monolithic `AdminService` into modular domain-specific
                    services for admins, clients, payments, etc.

- **2025-10-15:** Improved developer tooling by creating shared ESLint config and
                    fixing Turborepo workspace issues.

- **2025-10-16:** Refactored API client to use relative path prefixes for better
                    environment portability.

- **2025-10-17:** Implemented versioned IndexedDB wrapper for offline caching with
                    schema migrations and auto-cleanup.

- **2025-10-20:** Rebuilt API client with caching, SWR, retries, and concurrency limiting;
                    added dependency-based invalidation.

- **2025-10-21:** Simplified global search return value by removing unnecessary
                    wrapper objects.

- **2025-10-22:** Added admin-facing pages for managing clients with search and
                    filtering integrated into new API.

- **2025-10-23:** Introduced shared `@remoola/env` package for centralized environment
                    configuration using Zod validation.

- **2025-10-24:** Replaced local `.env` loaders across apps with
                    unified `@remoola/env` import; removed redundant logic.

- **2025-10-28:** Performed multiple Vercel deployment iterations (v3–v12);
                    reverted and retested deploy 6; improved Turbo + Vercel integration;
                    merged `api-versioning` branch; stabilized deployment and
                    routing configuration.

- **2025-10-29:** Restructured repository and cleaned up API and Turbo configuration;
                    resolved Vercel cookie/domain issues; fixed routing and parameter handling;
                    improved OpenAPI generation and migration setup; enhanced
                    debugging and ESLint configuration; finalized admin and frontend
                    integration.

- **2025-10-30:** Updated migrations and schema configuration for Wirebill;
                    added schedule modules; removed deprecated OpenAPI and web code;
                    cleaned redundant extras; improved consumer package references;
                    fixed ORM configuration and deployment stability.

- **2025-10-31:** Finalized minor adjustments and cleanup related to recent
                    integration work. Continue moving API.

</details>

---

<details>
<summary><strong>Changelog (November 2025)</strong></summary>

# Changelog (November 2025)

- **2025-11-03:** Reorganized signup types by splitting the monolithic file into focused
                    modules and consolidating imports through a centralized index.

- **2025-11-04:** Renamed form sections and step identifiers to descriptive names,
                    updated step naming (e.g., SIGNUP → SIGNUP_DETAILS), and removed debug logs.

- **2025-11-05:** Updated Consumer schema with cascade deletes and field restructuring.

- **2025-11-06:** Cleaned up unused files and dependencies across the consumer module
                    and signup flow.

- **2025-11-07:** Replaced custom signup components with reusable shared UI components from
                    the design system.

- **2025-11-10:** Implemented full multi-step signup flow for contractors and businesses,
                    added email templates, introduced Prisma error handling with detailed
                    validation messages, implemented secure cookie-based auth, added
                    comprehensive client-side validation, and created reusable UI components.

- **2025-11-11:** Refined multi-step signup validation and improved frontend–backend consistency.

- **2025-11-12:** Enhanced backend validation and standardized error handling across signup
                    steps.

- **2025-11-13:** Expanded consumer API layer and improved backend support for the multi-step
                    signup workflow.

- **2025-11-14:** Improved signup backend logic, aligned step validation, and refined profile
                    creation integration.

- **2025-11-17:** Performed additional refactoring of signup domain logic and standardized
                    step data structures.

- **2025-11-18:** Prepared controller and routing architecture for signup consolidation.

- **2025-11-19:** Refactored signup architecture by modularizing types, renaming sections and
                    steps, and removing legacy components.

- **2025-11-20:** Aligned codebase with the new type structure and fixed inconsistencies after
                    the refactor.

- **2025-11-21:** Cleaned up deprecated signup flows, DTOs, and services ahead of final
                    controller consolidation.

- **2025-11-24:** Consolidated all signup endpoints into `AuthController`, removed duplicate
                    controllers and services, updated route to `/auth/signup`, unified profile
                    creation flow, updated frontend calls.

- **2025-11-25:** Updated consumer API and site modules, added tagging support, and prepared
                    consumer-facing components for upcoming functionality.

- **2025-11-26:** Added consumer payment methods module with full Stripe integration,
                    implemented consumer contacts UI, performed consumer site updates.

- **2025-11-28:** “Verify Me” functionality, identity verification flow for consumers.

</details>

---

<details>
<summary><strong>Changelog (December 2025)</strong></summary>

# Changelog (December 2025)

- **2025-12-01:** Internal updates and preparations for December feature work.

- **2025-12-02:** Migrated authentication from localStorage tokens to secure cookie-based authentication,
                  standardized fetch configurations, refactored API routes with PATCH/DELETE support,
                  added Stripe session endpoints, moved auth types to shared directory, consolidated dashboard
                  types and logic, added Stripe identity verification with webhook handling, improved component
                  exports, added contact details page, and removed legacy signup controllers in favor of unified
                  `/auth/signup` endpoint.

- **2025-12-03:** Updated login endpoint to accept credentials via request body, standardized header handling,
                  normalized CORS header names, cleaned unused imports, replaced manual cookie forwarding
                  with request-based forwarding, added workspace-specific dev scripts, improved Stripe webhook
                  raw-body handling, and performed extensive cleanup of deprecated API code from previous architecture.

- **2025-12-04:** Performed large-scale Vercel-related fixes: Prisma generate issues, React hook dependency corrections,
                  extracted verification and auth callback logic, improved `/me` headers and debug logging,
                  resolved redirect issues for consumer login/signup, added Vercel backend URL for email verification,
                  added Vercel domain to allowed origins, fixed cookie issues, and improved Swagger configuration.

- **2025-12-05:** Added wallet functionality with balance, withdraw, and transfer features; added currency exchange with
                  multi-currency balance support; standardized fetch request headers; fixed documents API routes;
                  improved DTO naming, parameter naming, and removed `Dto` suffix; cleaned up debug logs and comments;
                  fixed billing phone formatting; added Swagger decorators; added proxy routes for documents and payments;
                  and improved code readability.

- **2025-12-08:** Updated Next.js version according to Vercel CVE-2025-55182 security recommendations and
                  performed additional fixes in consumer/admin apps.

- **2025-12-09:** Fixed build scripts, performed linting updates, improved internal configurations,
                  and completed a framework upgrade across packages.

- **2025-12-10:** Implemented full consumer profile management (personal, address, organization),
                  added profile update + password change flows, created profile settings UI,
                  added updated API routes with header forwarding, removed deprecated profile controller,
                  and applied minor fixes and polish.

- **2025-12-11:** Added unique constraint for `payment_request_attachment`, standardized naming (`originalname` → `originalName`),
                  centralized JWT cookie constants, improved file upload handling and S3 bucket switching,
                  refined invoice tagging/numbering, and standardized API endpoint construction using `URL`.

- **2025-12-12:** Refactored transaction system to signed double-entry ledger entries by replacing `TransactionModel`
                  with `LedgerEntryModel`, adding ledger enums/types and rails, migrating schema, and updating balance calculations
                  and payment flows accordingly.

- **2025-12-16:** Replaced `actionType` with a direction enum and introduced payment deduplication logic to reduce duplicate processing.

- **2025-12-17:** Improved contact creation with duplicate email validation and error handling, centralized Puppeteer/PDF
                  generation configuration, updated DB build pipeline to include Prisma generation,
                  added ledger entry deduplication + uniqueness constraints and indexes, improved ledger idempotency/transaction safety,
                  and added POST endpoint for currency exchange conversion.

- **2025-12-19:** Added Stripe `paymentMethodId` field with DB constraints and migration, renamed `@Identity()` param to `consumer`
                  across controllers with import cleanup, updated Stripe webhook service signature, and moved Stripe endpoints
                  from payment-methods into a dedicated Stripe controller.

</details>

---

<details>
<summary><strong>Changelog (January 2026)</strong></summary>

# Changelog (January 2026)

- **2026-01-12:** Prepared database and infrastructure refactoring by reviewing schema consistency,
                  auditing timestamp usage, evaluating foreign key performance,
                  and planning enhancements for payment methods, ledger idempotency,
                  and resource access standardization. (Database Audit and Refactoring Plan for Payments & Ledger)

- **2026-01-13:** Implemented foundational database improvements by adding strategic indexes,
                  defining cascade delete rules, increasing FX rate precision,
                  introducing enums for resource access, and preparing ledger idempotency
                  mechanisms for exactly-once processing. (Database Foundations & Ledger Idempotency)

- **2026-01-14:** Finalized database and infrastructure standardization by making
                  `createdAt` / `updatedAt` non-nullable with `@updatedAt`,
                  enhancing `PaymentMethodModel` with bank account support and Stripe fingerprinting,
                  adding ledger idempotency keys, and introducing telemetry opt-out
                  environment variables to turbo.json for Vercel. (DB & Infra Standardization)

- **2026-01-15:** Simplified admin frontend architecture by switching to a direct
                  Next.js API proxy with lightweight `apiFetch`, removed complex SWR setup,
                  added admin pages (consumers, payment requests, ledger, admin management),
                  improved naming and redirect logic, cleaned up legacy components,
                  and removed debug logging. (Admin FE Cleanup & Refactor)

- **2026-01-17:** Refactored admin frontend with improved routing, client-boundary loading
                  patterns, variable naming cleanup, enhanced dashboard and listing pages,
                  merged admin FE refactoring pull request, and attempted Vercel deployment
                  configuration which was later reverted. (Admin FE Routing Refinements)

- **2026-01-18:** Hardened API security, performance, and environment management by implementing
                  secure CORS configuration, rate limiting, response compression, Helmet security headers,
                  structured logging with correlation IDs, health check endpoints, reduced upload limits,
                  fixed Swagger routing and documentation, removed dead code and unused imports,
                  replaced RouterModule routing with explicit controller paths, and configured
                  Swagger UI for CSP compliance on Vercel with iterative fixes. (Harden API Security and Infrastructure)

- **2026-01-19:** Implemented robust consumer SWR architecture, corrected all consumer-specific
                  API route prefixes, introduced a centralized ApiClient with caching,
                  deduplication and retry logic, and migrated data fetching to type-safe
                  SWR hooks and mutations. (Implement Robust Consumer SWR Architecture)

- **2026-01-20:** Added global error boundaries with user-friendly fallbacks,
                  replaced blank screens with skeleton loading components,
                  improved resilience of the consumer app under failure states,
                  and enhanced overall UX consistency during loading and errors.(Consumer UX Resilience)

- **2026-01-21:** Simplified consumer error handling by removing the `ApiResponseError` abstraction,
                  eliminated unused utilities and redundant exports, cleaned up debug logging,
                  fixed unused parameter warnings in SWR hooks,
                  and finalized performance optimizations and bundle cleanup. (Simplify Consumer Error Handling and Cleanup)

- **2026-01-22:** Implemented saved payment methods with Stripe customer attachment,
                  added `stripePaymentMethodId` to enable payment method reuse,
                  implemented off-session payments with saved methods,
                  added Stripe customer creation and attachment logic,
                  created payment method migration system for existing records,
                  added admin endpoint for manual payment method migration,
                  updated payment UI to support saved method selection,
                  enhanced error handling for Stripe attachment failures,
                  removed debug console logs from payment service (Stripe Customer Attachment & Off-Session Payments),
                  implemented dark/light theme switching for the consumer app,
                  added `UserSettingsModel` with theme preference,
                  created backend API endpoints for theme settings,
                  implemented `ThemeProvider` with React context,
                  added CSS custom properties for dark theme support,
                  integrated theme selection into user profile settings,
                  and added system preference detection with localStorage persistence (Consumer light/dark mode).

- **2026-01-24:** Refactored consumer UI styling by centralizing and extracting reusable
                  CSS class constants, introducing a `joinClasses` utility,
                  migrating consumer components to CSS modules,
                  and removing legacy class-name helpers,
                  fixed dark mode by aligning theme classes and selectors,
                  set default theme to SYSTEM in `user_settings`,
                  renamed theme-related interfaces and settings for clarity,
                  extracted reusable `FormCard` and `FormField` components,
                  and fixed password change form by wrapping fields in a proper form,
                  adding autocomplete support and preserving existing layout.

- **2026-01-26:** Normalized consumer flows and admin actions by refining signup steps,
                  dashboard data views, modal interactions, and shared UI components,
                  added admin theme switching with CSS custom properties and a topbar toggle,
                  centralized admin styling into CSS modules and cleaned up views,
                  implemented comprehensive admin dashboard metrics including status totals,
                  recent payments, ledger anomalies and verification queue,
                  introduced `AdminDashboardService` for statistics and anomaly detection,
                  added consumer verification workflow with approve/reject/flag actions,
                  extended `Consumer` model with verification state and audit fields,
                  implemented ledger anomaly detection logic,
                  added dashboard API endpoints with client-side hooks,
                  and added admin API guard to prevent self-delete.

- **2026-01-27:** Implemented consumer payment request creation and sending flow,
                  added API endpoints for draft and send actions,
                  improved currency selection and formatting consistency,
                  applied role-based permissions for payment actions,
                  and refined payment-related UI flows.

- **2026-01-28:** Added FX automation UI with admin controls and scheduled conversions,
                  implemented server-driven currency feeds,
                  added supporting API endpoints and scheduler hooks,
                  improved consumer signup validation with step-level errors,
                  introduced consumer-specific password input component,
                  refined signup UI styles and layouts,
                  performed minor admin UI cleanup,
                  and added comprehensive project and feature documentation
                  covering the current codebase state.

- **2026-01-29:** Added Google OAuth for consumers with PKCE-based authentication,
                  integrated OAuth users into the existing signup flow with prefilled data,
                  hardened OAuth state handling and validation,
                  updated login UI to support Google sign-in,
                  extended environment configuration for Google OAuth,
                  adjusted cookie handling for OAuth-based auth,
                  wrapped signup start page with ErrorBoundary and Suspense,
                  added mobile navigation and responsive layout improvements,
                  implemented mobile header and bottom navigation,
                  refined shell layout and responsive breakpoints,
                  updated README with full Remoola documentation and setup instructions,
                  formatted OAuth utilities for readability,
                  and merged Turborepo-related changes into main.

- **2026-01-30:** Implemented robust exchange rate management with versioned rates,
                  approval workflow, provider metadata, staleness handling,
                  currency-aware rounding rules, backfill migration, and new
                  uniqueness constraints; added admin and consumer API endpoints
                  and updated UI for managing and viewing exchange rates;
                  improved exchange UI rate modal layout with two-column forms,
                  enforced mutually exclusive create/edit modals, and simplified
                  modal state handling; fixed OAuth cross-domain cookie issues by
                  introducing a secure OAuth token exchange flow with a new
                  `/oauth/exchange` endpoint; simplified OAuth cookie options and
                  removed stale maxAge handling; added email notifications for
                  payment requests by introducing a dedicated payment request
                  email template, implementing a shared mailer helper with
                  centralized configuration, and notifying payers via email when
                  a payment request is sent; added null-safety checks, fixed admin
                  seeding logic, corrected exchange service indentation and
                  variable references, and performed general cleanup and
                  changelog updates.

</details>

---

<details>
<summary><strong>Changelog (February 2026)</strong></summary>

# Changelog (February 2026)

<details>
<summary>2026-02-02</summary>

- **2026-02-02:** Added admin payment reversals (refund + chargeback actions),
                  implemented Stripe refund support, handled dispute webhooks,
                  captured reversal metadata, added idempotent reversal writes,
                  and introduced a refund reconciliation scheduler.

</details>

<details>
<summary>2026-02-03</summary>

- **2026-02-03:** Added refund and chargeback email templates with notification
                  wiring, implemented admin/consumer API routes and UI for
                  reversals, and fixed multiple `useEffect` dependency loops.

</details>

<details>
<summary>2026-02-04</summary>

- **2026-02-04:** Updated documentation to cover payment reversal logic and
                  exchange rate management features.

</details>

<details>
<summary>2026-02-05</summary>

- **2026-02-05:** Added reusable UI components and utilities including `FormInput`,
                  `DateInput`, `DataTable`, and `ErrorState`; replaced inline inputs
                  and custom tables across signup and settings forms; improved
                  date-of-birth validation (age + format checks); introduced locale-
                  aware date utilities and added `react-datepicker` dependency;
                  updated project scripts and documentation.

</details>

<details>
<summary>2026-02-07</summary>

- **2026-02-07:** Fixed consumer signup process issues and stabilized validation flow.

</details>

<details>
<summary>2026-02-16</summary>

- **2026-02-16:** Strengthened consumer signup flow with improved validation logic,
                  contractor/business switching fixes, and extended schema coverage;
                  enforced profile completion requirements before allowing payments;
                  added CountrySelect and PhoneInput with E.164 validation and
                  searchable country selection; introduced entity flow for business
                  and contractor entities with dedicated schema validation; required
                  legal status, tax ID, passport/ID where applicable; implemented
                  phone number format validation; added address parsing and automatic
                  prefill from legal address; migrated to `FormSelect` components;
                  fixed organization step visibility logic; added Tax ID validation
                  rules; introduced Google signup flow with optional password support,
                  OAuth hydration (email, name, account type, contractor kind),
                  cookie clearing logic, and dedicated signup-session routes;
                  added account type propagation through OAuth redirect; added
                  address blur validation and country-specific passport/ID rules;
                  expanded consumer and API test coverage (Google signup scenarios,
                  multi-field validation, schema edge cases); configured Jest
                  environment for API tests; updated Husky pre-commit hook to run
                  lint with `--force` and execute both consumer and API tests; and
                  performed changelog and maintenance updates.

</details>

<details>
<summary>2026-02-17</summary>

- **2026-02-17:**
                  ### 🚀 Feature
                  - Scaffolded new shared `@remoola/api-types` workspace package
                    with domain modules: common / auth / payments / contacts / http
                  - Expanded cross-app adoption of shared type contracts
                  - Replaced `uuid` with Node `crypto.randomUUID()` to simplify runtime

                  ### 🔐 Security
                  - Hardened Google OAuth for Vercel:
                    - Moved OAuth `state` to one-time server-side storage
                    - Fixed `invalid_state` production issues
                    - Enforced stricter refresh/logout behavior
                    - Deprecated legacy token-post OAuth endpoints
                  - Tightened CORS, cookie, and proxy configuration for Vercel
                  - Centralized environment validation and secure cookie handling

                  ### 📦 Types & Contracts
                  - Migrated admin & consumer auth/signup/payment unions to `@remoola/api-types`
                  - Centralized auth cookie keys under shared http module
                  - Standardized API/SWR typing to `ApiResponseShape`
                  - Removed duplicated literal unions and legacy auth type files
                  - Reduced frontend/backend contract drift with shared exports

                  ### 🛠 DevEx
                  - Simplified Vercel bootstrap guards
                  - Replaced raw `process.env` access with validated `envs` usage
                  - Added Vercel origins to global CORS configuration
                  - Required `AWS_BUCKET` for Vercel file uploads
                  - Updated turbo globalEnv configuration

                  ### 🧹 Cleanup
                  - Removed unused runtime dependencies across API, frontend, database, and root workspace
                  - Pruned unreferenced API files
                  - Refreshed lockfile to reduce dependency surface
                  - Removed obsolete exports and unused env variables

</details>

<details>
<summary>2026-02-18</summary>

- **2026-02-18:**
                  ### 🚀 Feature
                  - Add contact handoff flow from payment request modal:
                    - Allow unknown-recipient flow (continue without contact / create contact with prefilled email)
                    - Preserve draft values when returning from contact creation
                    - Improve modal UX with default **Continue** action + **More Actions** dropdown
                  - Allow email-only payers in payment requests:
                    - Store `payerEmail` when `payerId` is missing
                    - Support claiming email-only payer requests safely
                    - Add confirmation flow to add/skip contact creation
                  - Remove `expectationDate` from payment requests:
                    - Archive historical data safely before column removal
                    - Add admin endpoints & UI for archived expectation visibility
                  - Introduce isolated temporary test DB harness (`@remoola/test-db`):
                    - Per-file temporary Postgres instances
                    - Docker-compose with testcontainers fallback
                    - Automatic migrations + fixture seeding
                    - Strict local-only isolation

                  ### 🔐 Security
                  - Preserve ledger invariants while enabling email-only payers
                  - Add regression tests to prevent ledger anomalies
                  - Redact recipient details from mailer success logs
                  - Extract password hashing & verification utilities into `security-utils` package
                  - Enforce strict DB isolation for test runs to prevent accidental prod/dev cross-use

                  ### 📦 Types & Contracts
                  - Tighten auth typing with explicit DTO usage
                  - Replace untyped login bodies with structured DTOs
                  - Use `NotFoundException` for safer contact lookups
                  - Align Prisma schema with production-safe migrations:
                    - Backfill tag timestamps
                    - Convert string columns to `TEXT`
                    - Enable `pgcrypto` UUID defaults
                    - Add missing `billing_details_id` index
                    - Prevent schema drift

                  ### 🛠 DevEx
                  - Harden Turbo/Vercel build scope:
                    - Remove test-only workspaces from app devDependencies
                    - Prevent CI/npm resolution failures for private workspace packages
                  - Switch consumer Jest config to shared `@remoola/jest-config`
                  - Add PostgreSQL design rules documentation
                  - Add `ADMIN_APP_ORIGIN` to turbo global environment

                  ### 🧹 Cleanup
                  - Remove noisy debug logs from consumer API routes
                  - Remove unnecessary Next.js transpilation for admin

</details>

<details>
<summary>2026-02-19</summary>

- **2026-02-19:**
                  ### 🚀 Feature
                  - Add full admin list pagination, filters, and debounced search across:
                    - Admins, Consumers, Ledger, Payment Requests,
                      Exchange Rules/Scheduled, Expectation Archive
                  - Extract reusable *TableBlock components for all admin list views
                  - Introduce shared admin list query types and constants in `@remoola/api-types`
                  - Add fintech-safe withdraw/transfer:
                    - Idempotency-key support
                    - Balance checks inside DB transaction
                    - Advisory locks to prevent race conditions
                  - Require idempotency-key header for withdraw and transfer (400 if missing)
                  - Replace Redis OAuth state store with PostgreSQL:
                    - New `oauth_state` table
                    - Atomic consume via DELETE RETURNING
                    - Cleanup scheduler
                  - Improve invoice generation:
                    - Deduplicate within 60s window
                    - Safe error wrapping (`INVOICE_GENERATION_FAILED`)
                    - Payment view auto-refresh
                  - Add Sonner toasts across consumer app
                  - Add searchable selects, masked monetary inputs, DateInput
                  - Add `data-testid` attributes across consumer UI
                  - Introduce shared error codes via `@remoola/shared-constants`

                  ### 🔐 Security
                  - Enforce non-negative consumer balances (exchange + reversals)
                  - Add advisory locks + balance re-check inside transaction
                  - Stripe reversals throw 503 for retry safety on insufficient balance
                  - Harden PaymentRequest + Ledger idempotency:
                    - Add idempotency keys to ledger entries
                    - Make duplicate webhook/payment retries no-ops
                  - Stripe amount calculation by currency fraction digits (fix JPY & non-2-decimal currencies)
                  - Replace Redis OAuth state store with DB-backed secure implementation

                  ### 📦 Types & Contracts
                  - Add admin list DTOs and query types in `@remoola/api-types`
                  - Standardize paginated responses `{ items, total, page, pageSize }`
                  - Add canonical error codes package and map to consumer-facing messages
                  - Fix DTO whitelist using `@Expose()`
                  - Remove legacy/unused DTOs and barrel exports
                  - Default pageSize 10 across admin list endpoints

                  ### 🛠 DevEx
                  - Add regression tests for:
                    - Ledger balance correctness
                    - Bounded history queries
                    - Admin pagination
                    - Withdraw/transfer idempotency
                  - Cap findMany queries to prevent unbounded reads
                  - Run Vercel guard build via Turbo to ensure proper package build order
                  - Add bounded `take` limits (500 / 2000 caps)
                  - Improve Next.js SSR hydration (stable FormSelect instanceId)

                  ### 🧹 Cleanup
                  - Remove Redis, ioredis, and REDIS_* env vars
                  - Drop unused DTOs and dead code
                  - Remove unused admin perf helpers
                  - Fix UUID query filters (use equals instead of contains)
                  - Minor formatting and dependency cleanup

- **2026-02-20:**
                  ### 🚀 Feature
                  - Add pagination to consumer list endpoints:
                    - Contacts, Contracts, Documents, Payments,
                      Exchange Rules, Scheduled Conversions
                    - Introduce `PaginationBar` component (positioned outside table card for Contracts)
                  - Replace hardcoded currency arrays with `CURRENCY_CODES` from `@remoola/api-types`
                  - Add consumer preferred currency setting (API + UI with allowlist validation)
                  - Introduce new UI components:
                    - `AmountCurrencyInput`
                    - `RecipientEmailField`
                  - Align consumer layouts (Contacts/Documents consistency)
                  - Standardize form controls (42px height, `rounded-lg`)
                  - Add authentication audit + lockout mechanism (migrations + shared module)

                  ### 🔐 Security
                  - Add login audit tracking and account lockout protections
                  - Improve auth refresh + session-expired handling logic
                  - Enforce currency allowlist via shared api-types contracts

                  ### 📦 Types & Contracts
                  - Add `PaginatedResponsePage` to `@remoola/api-types`
                  - Centralize currency types in shared package
                  - Add consumer settings types to shared contracts
                  - Remove hardcoded currency arrays across apps

                  ### 🛠 DevEx
                  - Add new `db-fixtures` workspace package with CLI and seed utilities
                  - Sync and expand documentation:
                    - Update README repo layout
                    - Align PROJECT_DOCUMENTATION with current API/DB state
                    - Refresh FEATURES_CURRENT
                    - Add `PROJECT_SUMMARY.md`
                  - Update docs to reflect OAuth routes, expectation archive,
                    package structure, DB models/enums

                  ### 🧹 Cleanup
                  - Remove hardcoded CURRENCIES constants
                  - Align UI structure and table wrapping patterns
                  - Minor formatting and structural improvements

</details>

<details>
<summary>2026-02-24</summary>

- **2026-02-24:**
                  ### 🚀 Feature
                  - Standardize shared domain constants across platform via `@remoola/api-types`
                  - Introduce new shared modules:
                    - `consumer/theme` (`THEME`)
                    - `payment-reversal` (`PAYMENT_REVERSAL_KIND`)
                    - `query-params` (`BOOLEAN_QUERY_VALUE`)
                  - Add currency helper utilities:
                    - `isCurrencyCode`
                    - `toCurrencyOr*`
                    - `getCurrencySymbol(TCurrencyCode)`
                  - Apply shared constants across API, Admin, and Consumer flows:
                    - Signup and consumer settings
                    - Payments and reversals
                    - Exchange and withdraw workflows
                    - Dashboard and FX scheduling

                  ### 🔐 Security
                  - Add `@Throttle` protection to refund and chargeback endpoints
                  - Restore strict validation for Google Sign-In credentials
                    (`@IsString()` enforcement)
                  - Improve null/undefined sanitization via hardened `remove-nil`
                    recursive cleanup logic

                  ### 📦 Types & Contracts
                  - Standardize enum-like constants to `SCREAMING_SNAKE_CASE`
                  - Introduce shared constant arrays:
                    - `ADMIN_TYPES`
                    - `ACCOUNT_TYPES`
                    - `CONTRACTOR_KINDS`
                    - `LEGAL_STATUSES`
                    - `ORGANIZATION_SIZES`
                    - `CONSUMER_ROLES`
                    - `TRANSACTION_STATUSES`
                    - `VERIFICATION_STATUSES`
                    - `LEDGER_ENTRY_TYPE_VALUES`
                    - `SCHEDULED_FX_CONVERSION_STATUSES`
                    - `HOW_DID_HEAR_ABOUT_US_VALUES`
                  - Currency refactor:
                    - Replace `ALL_CURRENCY_CODES`
                      → `CURRENCY_CODE` + `CURRENCY_CODES`
                  - Align DTOs and services across API/Admin/Consumer with shared contracts
                  - Fix DTO issues:
                    - Remove duplicate `@ApiProperty` declaration
                    - Use type-only imports for currency DTOs

                  ### 🛠 DevEx
                  - Improve Swagger/OpenAPI documentation:
                    - Add descriptions to DTO properties across admin,
                      consumer, and common modules
                  - Sync documentation ecosystem:
                    - CHANGELOG
                    - README
                    - PROJECT_DOCUMENTATION
                    - PROJECT_SUMMARY
                    - FEATURES_CURRENT
                  - Document `/api` prefix usage and auth audit/lockout behavior
                  - Add `REDIS_URL` to Turbo global environment configuration

                  ### 🧹 Cleanup
                  - Remove legacy `entry.ts` exports from api-types
                  - Reorder barrel exports for clearer module structure
                  - Fix typo `geyById` → `getById`
                  - Improve typing safety using `Record<string, unknown>`
                  - Align imports across apps to shared constants

</details>

<details>
<summary>2026-02-25</summary>

- **2026-02-25:**
                ### 🚀 Feature — Financial Safety Architecture
                - Introduce append-only financial ledger model via `LedgerEntryOutcome`
                  (ledger entries are no longer mutated)
                - Derive effective ledger state from latest outcome using PostgreSQL
                  `LATERAL` queries
                - Align admin ledger and payment-request services with outcome-based
                  balance calculations
                - Update Stripe payout, verification, and payment-intent handlers
                  to append outcomes instead of modifying ledger rows

                ### 🔐 Financial & Concurrency Safety
                - Protect balance calculations using `SELECT FOR UPDATE`
                  row-level locking on ledger entries
                - Introduce operation-scoped PostgreSQL advisory locks:
                  - `consumerId:exchange`
                  - `consumerId:withdraw`
                  - `consumerId:transfer`
                - Enforce deterministic lock ordering for transfers to prevent deadlocks
                - Implement Stripe webhook at-most-once processing:
                  - Add `StripeWebhookEventModel`
                  - Enforce unique Stripe event IDs
                  - Safely return `200 OK` on duplicate webhook retries (`P2002`)

                ### 🗄 Database & Migrations
                - Add append-only ledger migration:
                  - `ledger_entry_outcome_append_only`
                - Add webhook deduplication migration:
                  - `stripe_webhook_event_dedup`
                - Standardize schema naming:
                  - `standardize_columns_snake_case`
                - Apply Prisma `@map("snake_case")` alignment for remaining columns
                - Add migration READMEs under
                  `packages/database-2/prisma/migrations`

                ### 🧪 Testing & Reliability
                - Add concurrency test coverage:
                  - `consumer-exchange.concurrency.spec`
                  - `consumer-payments.concurrency.spec`
                - Add `critical-updates.e2e-spec`
                - Promote temporary DB isolation tests into full e2e test suite
                - Strengthen financial race-condition validation scenarios

                ### 🛠 DevEx & Documentation
                - Add financial architecture documentation:
                  `docs/FINANCIAL_SAFETY_AND_DB_COMPLIANCE.md`
                - Move major project documentation into `/docs`:
                  - FEATURES_CURRENT
                  - PROJECT_DOCUMENTATION
                  - PROJECT_SUMMARY
                - Refresh PostgreSQL design rules documentation
                - Improve application health checks and bootstrap process

                ### 🧹 Cleanup & Alignment
                - Update consumer profile DTOs and profile service alignment
                - Improve `OrganizationDetailsForm` handling
                - Adjust Turbo build configuration and Jest e2e setup
                - Normalize schema and service consistency across admin,
                  consumer, and API modules

</details>

<details>
<summary>2026-02-26</summary>

- **2026-02-26:**
                ### 🚀 Feature
                - Verify Me / Complete your profile: dashboard shows “Complete
                  your profile” (link to settings) when required signup/profile
                  fields are missing; “Verify Me” when profile complete; API
                  stripe/verify/start returns 400 PROFILE_INCOMPLETE_VERIFY when
                  profile incomplete; ConsumerPaymentsService.assertProfileCompleteForVerification;
                  AdminAdminsModule and ConsumerPaymentMethodsModule import
                  ConsumerPaymentsModule so StripeWebhookService can assert
                  profile complete; tests for UI condition
                  (isProfileCompleteFromTasks) and API validation
                - Shared Personal Details form: PersonalDetailsFields component
                  and lib/validation (personalDetailsSchema, getFieldErrors);
                  reused in signup PersonalDetailsStep and Profile Settings
                  PersonalDetailsForm; Legal status select + enum validation in
                  profile; API profile update: dateOfBirth string→Date conversion,
                  legalStatus @IsEnum
                - Shared Address Details form: AddressDetailsFields component
                  and lib/validation addressDetailsSchema; reused in signup
                  AddressDetailsStep and Profile Settings AddressDetailsForm;
                  client validation on save for profile address details
                - Consumer profile types and typed settings form props
                  (ConsumerProfile, PasswordChangeForm, PersonalDetailsForm,
                  AddressDetailsForm, ProfileSettingsClient); PaymentView and
                  PaymentsList typed state and params
                - Payments: pay-by-email for unregistered recipients; store
                  `requester_email`, optional `requester_id`; reversal and ledger
                  requester entry only when `requester_id` present; counterparty
                  from `requester_email` when requester not in DB
                - Balance and anomaly logic use effective ledger status:
                  append-only outcomes; status from latest outcome via LATERAL
                  join; dashboard (admin + consumer), exchange, payments, Stripe
                  webhook updated; snake_case columns, parameterized raw SQL
                - Serialization: advisory lock retained for exchange, withdraw,
                  transfer, reversal; FOR UPDATE removed from aggregate balance
                  queries; locking per consumer
                - Admin reversal: auth audit log event PAYMENT_REVERSAL; balance
                  check and advisory lock only when `requester_id` present
                - Consumer startPayment: unregistered recipient
                  (`requester_id` null, `requester_email` set); Stripe ledger
                  returns INVALID_LEDGER_STATE_EMAIL_PAYMENT_STRIPE when no
                  entries and no `requester_id`
                - StartPaymentForm: send to email not in contacts; confirmation
                  modal (continue / add contact and continue / add full contact)
                - WithdrawTransferPageClient: use BalancesPanel
                - Admin payment-requests archive: WHERE from Prisma.sql
                  fragments only (parameterized)

                ### 🔐 Security / Financial Safety
                - Ledger: effective status for balance/anomalies; no
                  UPDATE/DELETE on financial history; double-entry and
                  idempotency unchanged
                - Payments: requester optional; reversal and startPayment
                  handle null requester; idempotency keys unchanged
                - Stripe webhooks: reversal idempotency and replay safety
                  unchanged; requester ledger entry only when `requester_id`
                  present
                - Auth: admin reversal audit log only; no token/session changes
                - Money: rounding, minor units, currency/amount handling
                  unchanged
                - Concurrency: advisory lock retained; FOR UPDATE removed from
                  aggregate SUM; serialization via advisory lock per consumer
                - Centralized currency/amount formatting (display-only,
                  Intl.NumberFormat); no change to money math or minor units

                ### 🗄 Database & Migrations
                - Migration `20260225160000_payment_request_requester_email`:
                  add `requester_email` (TEXT), `requester_id` nullable, FK
                  ON DELETE SET NULL; additive, backward compatible
                - Prisma schema: `requesterId` optional, `requesterEmail`;
                  relation SetNull
                - Effective-status queries: raw SQL with LATERAL join;
                  snake_case columns; parameterized; no data migration; backward
                  compatible
                - Rollback: deploy previous app; migration rollback documented;
                  prefer fixing forward; migration README for deploy order
                - Types/format refactor: no new migrations; rollback revert-only

                ### 📦 Types & Contracts
                - Admin, consumer, Stripe flows use `requesterEmail` and handle
                  null `requesterId`; shared shapes aligned for pay-by-email
                - Consolidate shared types: single source for consumer contact,
                  address-details, payment-methods, payment-requests in
                  packages/api-types; ApiErrorSchema (Zod) and ApiErrorShape
                  centralized (error details z.unknown()); apps/api common DTOs
                  for address-details and contact, admin/consumer re-export;
                  backward-compatible contract alignment
                - Type-safety pass: replace `any` with domain types and
                  `unknown` plus narrowing in admin/consumer api, guard,
                  api-utils, FormCard, AddPaymentMethodModal, hooks, swr-config,
                  validation, performance; ConsumerProfile and typed settings
                  form props; PaymentView/PaymentsList typed state and params;
                  consumer mutationFetcher key-to-URL fix; ESLint
                  no-explicit-any warn; remove unused tryCodeOrNull from
                  shared-constants
                - Build fixes: PaymentRequestDetail explicit amount,
                  currencyCode, status (formatCurrencyDisplay); FormCard
                  Omit form `title` for ReactNode override and backtick quotes

                ### 🧪 Testing & Reliability
                - Exchange: getBalanceByCurrency and concurrency specs
                  (effective status, $executeRaw, balance without FOR UPDATE)
                - Payments: startPayment unit tests (registered, unregistered,
                  self-by-id, self-by-email, invalid amount); transfer happy
                  path; concurrency specs (advisory lock + balance check)
                - Existing coverage for reversals and dashboard preserved
                - Concurrency tests cover advisory lock and balance-check races
                - consumer: currency.test.ts (formatCurrencyDisplay,
                  formatCentsToDisplay); admin: format.test.ts (formatAmount);
                  api: invoice.v5.spec.ts (null payer/requester, payerEmail
                  fallback, amount/currency render)
                - getSteps.test: TContractorKind assert instead of any;
                  remaining any limited to API spec mocks (test-only)

                ### 🛠 DevEx & Infrastructure
                - test-db: PrismaClient datasourceUrl; Jest cache false
                - admin: Jest config and format tests; shared formatAmount and
                  ApiErrorSchema from api-types; consumer: shared currency
                  helpers and api-types for types and error handling
                - API e2e: config path updated
                - docs/project-design-rules.md added; project-design-rules
                  references packages/database-2
                - README and docs index: all doc paths use docs/ prefix;
                  project-design-rules in PROJECT_SUMMARY and
                  PROJECT_DOCUMENTATION
                - db-fixtures and seed comments updated

                ### 🧹 Cleanup
                - Signup steps (AddressDetailsStep, PersonalDetailsStep): React
                  hooks lint — clearError wrapped in useCallback; handlePersonalChange
                  and values defined before conditional return (rules of hooks);
                  exhaustive-deps satisfied for handleAddressChange and
                  handlePersonalChange
                - Consolidate shared types and format helpers to reduce
                  contract drift and duplicate logic; invoice template (invoice.v5)
                  null-safe for payer/requester (fallback to payerEmail or "—")
                - Type-safety pass across admin and consumer apps; explicit
                  return types and error narrowing; no new any or weakened types

                ### 📋 Balance + logging (2026-02-26)
                - **apps/api** [FINANCIAL]: Add `BalanceCalculationService` and
                  `BalanceCalculationModule`; admin reversal, consumer exchange,
                  payments, Stripe webhook use shared balance service with same
                  LATERAL/outcome-status logic. [SEC] Replace `console` with Nest
                  `Logger` in `MailingService`. Add `PrismaModule`; wire
                  `BalanceCalculationModule` in `DatabaseModule`. ESLint: allow
                  `no-explicit-any` and `no-unused-vars` in test files. Jest:
                  maxWorkers 1, forceExit, detectOpenHandles, verbose, cache false.
                  Exchange and payments unit/concurrency specs inject
                  `BalanceCalculationService` (real or mock).
                - **apps/admin**: Replace console with `clientLogger` in
                  ErrorBoundary, ThemeProvider, api, performance; add
                  `lib/logger.ts` via `createClientLogger` from `@remoola/ui`.
                - **apps/consumer**: Replace console with `clientLogger` in
                  ErrorBoundary, ThemeProvider, api-utils, PreferredCurrencySettingsForm,
                  ThemeSettingsForm; add `lib/logger.ts` via `createClientLogger`.
                - **packages**: database-2 Prisma schema formatting/whitespace only
                  [DB] (no new columns or migrations). db-fixtures: use
                  process.stdout/stderr instead of console. env: do not log parsed
                  env (keys count only in dev). eslint-config (nest, next): test
                  file rules for no-explicit-any/no-unused-vars. jest-config nest:
                  testEnvironment. test-db: log DB URL only when
                  TEST_DB_VERBOSE=1. ui: add `createClientLogger` and logger
                  export.
                - **Safety notes**: Ledger append-only preserved; balance logic
                  read-only (SUM over ledger_entry). Idempotency DB-enforced
                  unchanged; advisory locks still acquired by callers before
                  balance check in tx.

</details>

<details>
<summary>2026-02-27</summary>

- **2026-02-27:**
  ### 🚀 Feature
  - Admin app: centralized 401 / session-expired flow — toast, call to
    `/api/auth/logout` to clear cookies, redirect to login; `handleSessionExpired`
    in API client on 401; `resetSessionExpiredHandled()` on login page mount.
  - Backend: admin action audit log — new table `admin_action_audit_log` and
    migration; `AdminActionAuditService` records payment_refund, payment_chargeback,
    admin_password_change, admin_delete, admin_restore, consumer_verification_update,
    exchange rate CRUD and scheduled actions (with adminId where available).
  - Admin audit module: GET `/admin/audit/auth` and GET `/admin/audit/actions`
    (SUPER-only), pagination and filters (email, date range, action); DTOs and
    service; error code `ADMIN_ONLY_SUPER_CAN_VIEW_AUDIT`.
  - Admin app: Audit page (Auth log and Actions tabs), proxy API routes, SWR
    hooks and types, Sidebar link for SUPER admins; filters and table layout
    aligned with Exchange Rate view.
  - Admin audit: Next.js proxy routes GET `/api/audit/auth` and
    GET `/api/audit/actions` and `/audit` page with Auth log and Actions tabs
    (filters, pagination, SUPER-only redirect); local toast keys and error
    mapping for audit load failures.

  ### 🔐 Security / Financial Safety
  - Session expiry handling ensures tokens and cookies are cleared before
    redirect; audit log is append-only and does not affect main transaction flows.
  - SUPER-only access to audit endpoints enforced in controller.

  ### 🗄 Database & Migrations
  - Migration `20260227120000_admin_action_audit_log`: creates
    `admin_action_audit_log` (admin_id, action, resource, resource_id, metadata,
    ip_address, user_agent, created_at) with indexes; FK to admin.

  ### 🛠 DevEx & Infrastructure
  - db-fixtures: `APP_TABLES` extended with `auth_audit_log`, `auth_login_lockout`,
    `admin_action_audit_log`, `ledger_entry_outcome`, `ledger_entry_dispute` for
    refresh truncate; expectation_date_archive insert summary only when table
    exists (table removed in prior migration); README documents truncated tables.
  - Admin list views (Ledger, Payment Requests, Consumers, Exchange Rules,
    Scheduled, Admins, Expectation Date Archive, Ledger Anomalies): header
    actions use `adminActionRow`; loading states aligned with Exchange Rate view.
  - **Re-auth / step-up for critical actions**: Refund, chargeback, admin
    delete, and admin password reset require re-entry of current admin password.
    Backend: `AdminAuthService.verifyStepUp(adminId, passwordConfirmation)`;
    `AdminAuthModule` exported for use in payment-requests and admins modules;
    `PaymentReversalBody` and admin DTOs (`AdminPasswordPatchBody`,
    `AdminUpdateBody`) include `passwordConfirmation`; error codes
    `ADMIN_PASSWORD_CONFIRMATION_REQUIRED`, `ADMIN_PASSWORD_CONFIRMATION_INVALID`.
    Admin app: reversal confirm modal and delete/reset-password modals show
    "Re-enter your password to continue"; requests send `passwordConfirmation`.
  - E2E: `admin-step-up.e2e-spec.ts` covers step-up on admin password reset
    and admin delete (password confirmation required).

  ### Fixed
  - Admin list views: filter/search no longer triggers full view refresh;
    `useAdmins` uses `keepPreviousData` and table-only "Updating…" overlay;
    same overlay and pagination "Updating…" on Consumers, Payment Requests,
    Ledger, Exchange Rules, Scheduled, Expectation Date Archive, Exchange Rates.
  - Admins view: row action buttons (Reset password, Delete, Restore) stop
    propagation so clicking them does not navigate via row link; `type="button"`
    on all action and Create admin buttons.
  - Admins view: reset password and search no longer autofilled by browser;
    search placeholder "Search by email", modal password fields
    `autoComplete="new-password"`.
  - Admin reset password mutation: request URL fixed to `/api/admins/:id/password`
    (origin-relative) so PATCH reaches Next.js API route.
  - Admins list API: `useAdmins` key built via `adminsListUrl(filters)` so
    query params are always sent; search and filters work reliably.
  - Search inputs: native clear button hidden via CSS for
    `adminSearchInputWithClear` so only one clear control is visible.
  - Table block Refresh: `refreshKey` in `load` dependency array (with
    eslint-disable) so Refresh button triggers refetch in all list table blocks.

  ### Changed
  - Admin app: all text inputs and textareas set
    `autoComplete="off"` (or `new-password` where appropriate),
    `autoCorrect="off"`, `autoCapitalize="off"` to avoid autofill/autocorrect.
  - Admin API DTOs: `@Expose()` added on all properties of list/query DTOs
    (admin-list-pagination, exchange rules/scheduled, consumers, ledger,
    payment-requests, expectation-date-archive, audit auth/actions).
  - Admin app forms: inputs and textareas have `id`/`name`; labels use
    `htmlFor` for accessibility and correct form association.

  ### 📄 Documentation
  - Project root `docs/` and README.md updated with
    doc-sync note (setup/commands/layout only).

</details>

</details>

---

<details open>
<summary><strong>Changelog (March 2026)</strong></summary>

# Changelog (March 2026)

<details>
<summary>2026-03-03</summary>

- **2026-03-03:**
  ### 🚀 Feature
  - Recipient email autocomplete (consumer + API).
  - Backend: `GET /consumer/contacts?query=<string>&limit=10` returns minimal
    contact list (`id`, `name`, `email`) filtered by authenticated consumer,
    with email/name ILIKE search.
  - Frontend: `RecipientEmailField` upgraded with debounced search (300ms),
    dropdown `"Name — email"`, clear button, keyboard support (arrows + Enter),
    and no silent email mutation; used in `CreatePaymentRequestForm`,
    `StartPaymentForm`, and `TransferForm`.
  - No ledger or idempotency changes in this feature; no new migrations.

  ### 🔐 Security / Financial Safety
  - Ledger & payment idempotency (`docs/FINANCIAL_SAFETY_AND_DB_COMPLIANCE.md`): outcome
    creation with `externalId` now uses `createOutcomeIdempotent()`; P2002
    is caught and treated as already-processed (Stripe webhook, stripe.service,
    stripe-reversal.scheduler).
  - `createStripeReversal` now sets deterministic `idempotencyKey` on both
    ledger entry creates (`reversal:${kind}:${stripeObjectId}:payer` /
    `:requester`); on P2002 returns without sending emails.

  ### 🗄 Database & Migrations
  - Migration `20260303120000_ledger_entry_outcome_unique_external`: adds
    unique partial index on `ledger_entry_outcome(ledger_entry_id, external_id)`
    where `external_id IS NOT NULL`; preflight SQL for duplicate check and
    rollback steps documented in migration README.
  - Migration `20260303140000_exchange_rate_status_enum_snake_case`: renames
    PostgreSQL enum `"ExchangeRateStatus"` → `"exchange_rate_status_enum"` to
    align with Prisma `@@map` and snake_case DB naming (MIGRATION_AUDIT.md
    BLOCKER 1); schema updated with `@@map("exchange_rate_status_enum")`.

  ### ♻️ Refactor
  - Consumer app uses shared SVG icons from `@remoola/ui`.
  - Added `CreditCard`, `Landmark`, `Star`, `Pencil`, `Trash`, `Clipboard`,
    and `FileDown` icons to `packages/ui`; `apps/consumer` now imports these
    from `@remoola/ui`, and `lucide-react` was removed from consumer.
  - Root script `typecheck` standardized to `turbo run typecheck`; `typecheck`
    task used in `turbo.json`.
  - Tailwind `className` formatting per
    `governance/07_UI_TAILWIND_CLASSNAME_FORMAT.md` (multiline, one utility per
    line) in `apps/consumer` and `packages/ui` with no visual behavior change.

</details>

<details>
<summary>2026-03-04</summary>

- **2026-03-04:**
  ### 📄 Documentation
  - `docs/FINANCIAL_SAFETY_AND_DB_COMPLIANCE.md`: ledger append-only note updated; production
    consumers with financial history must use soft-delete. Dev/staging may
    hard-delete consumer via Prisma Studio (cascade removes related rows).

  ### 🗄 Database & Migrations
  - Migration `20260304120000_ledger_entry_outcome_dispute_cascade`: changes
    `ledger_entry_outcome` and `ledger_entry_dispute` FKs from ON DELETE RESTRICT
    to ON DELETE CASCADE; consumer delete (e.g. Prisma Studio) cascades. Prefer
    soft-delete (`consumer.deleted_at`) for production consumers with financial
    history.

  ### ♻️ Audit follow-up
  - **Ledger:** COMPLETED_AND_PENDING balance now uses
    `IN ('COMPLETED','PENDING')`; added `balance-calculation.service.spec.ts`
    and `getBalancesIncludePending` test.
  - **Exchange:** Recovery path moved inside transaction with advisory lock;
    P2002 handled (return existing).
  - **Stripe:** DENIED outcome in `stripe.service` now uses
    `createOutcomeIdempotent` with `externalId`.
  - **Security:** `getBalancesCompleted` throws generic
    `InternalServerErrorException`; mailing logs no longer log subject/error
    message; `mapPrismaKnownError` omits details in API response. Mailing
    success logs now use generic "Email sent successfully" (no subject).
  - **Docs:** `docs/FINANCIAL_SAFETY_AND_DB_COMPLIANCE.md` updated (FOR UPDATE vs
    advisory lock; migration backfill/lock notes; balance mode note).

  ### Optionals
  - **Docs:** Exchange row in critical surfaces now notes serialization:
    advisory lock + re-read target in tx (no FOR UPDATE on balance rows).
  - **Stripe:** DENIED outcome loop wrapped in `$transaction` for atomicity.
  - **Logging:** `getBalancesCompleted` and Stripe webhook paths
    (`collectPaymentMethodFromCheckout`, migration attach, migration failed,
    payment method attachment) log only generic messages (no `error.message`/
    stack) to avoid internal/Stripe text in logs.
  - **Stripe webhook:** `handlePayoutFailed` now records DENIED outcome inside
    `$transaction` for parity with `stripe.service` DENIED path.
  - **Security (review):** `stripe.service` `payWithSavedPaymentMethod` now
    throws generic `InternalServerErrorException('Payment could not be completed')`
    instead of rethrowing Stripe errors, so clients never receive Stripe/internal
    messages. `getBalancesIncludePending` now catches and throws generic error for
    parity with `getBalancesCompleted`.
  - **Ledger idempotency (review):** admin reversal now handles `P2002` by
    re-reading reversal by idempotency key and returning existing result for
    duplicate requests.
  - **Stripe webhook consistency:** `handlePayoutPaid` now records COMPLETED
    outcome inside `$transaction` (parity with `handlePayoutFailed`).
  - **Validation security:** Prisma validation errors return generic
    `Invalid request data` in production.
  - **Payments API hardening:** `withdraw` and `transfer` now return generic
    `InternalServerErrorException('An unexpected error occurred')` for
    unexpected non-business failures (while preserving existing `BadRequest`
    and idempotent duplicate handling).
  - **Admin reversal policy:** Stripe `REFUND` now uses external-source-of-truth
    flow: after successful Stripe refund, internal reversal is appended
    idempotently without requester-balance gating. `CHARGEBACK` keeps in-tx
    balance validation under `:reversal` advisory lock.
  - **Webhook idempotency:** duplicate Stripe webhook events are now reprocessed
    idempotently (not short-circuited) to recover from partial failures.
  - **Webhook reversal policy:** Stripe webhook `REFUND` reversal now mirrors admin
    policy: external-source-of-truth flow appends reversal idempotently without
    requester-balance gating; `CHARGEBACK` keeps in-tx balance validation.

</details>

<details>
<summary>2026-03-05</summary>

- **2026-03-05:**
  ### 🚀 Feature
  - Scaffold consumer(mobile) app
    - BFF architecture with 50+ API route handlers
    - Features: auth, payments, contacts, documents, exchange, settings
    - Mobile-optimized layouts and responsive navigation
  - Add OAuth `returnOrigin` parameter support for multi-app consumer deployments
  - Add database connection retry logic (30 attempts, 500ms delay) before bootstrap
  - Extend CORS configuration to include consumer(mobile)

  ### 🔐 Security
  - Validate `returnOrigin` against CORS_ALLOWED_ORIGINS before using in OAuth redirect
  - Persist validated `returnOrigin` in OAuth state for callback flow
  - Add rate limiting to OAuth `/google/start` endpoint (20 requests/min)
  - Remove PII from OAuth error logs
  - Add PII redaction to client-side logger (email/phone masking, secret redaction)

  ### 🛠 DevEx
  - Update project docs
  - Add governance exemption for logger abstraction layer console usage

  ### 📄 Documentation
  - Document OAuth `returnOrigin` parameter usage in API docs
  - Document CORS configuration for three apps (admin, consumer, consumer-mobile)

  ### ✅ Governance & Review
  - Resolved: logging exemption, PII removal, test documentation
  - Issues fixed: rate limiting, CORS verification
  - TypeScript: ✅ No errors, Linting: ✅ Pass, Tests: ✅ 65/65 passing
  - Monorepo boundaries: ✅ No cross-app imports
  - Backward compatibility: ✅ OAuth state handles 6 or 7 fields

</details>

<details>
<summary>2026-03-06</summary>

- **2026-03-06:**
  ### 🚀 Feature
  - Multi-app origin support for OAuth flows:
    - Added `CONSUMER_MOBILE_APP_ORIGIN` env var for mobile app deployments
    - Added `ADMIN_APP_ORIGIN` to schema for completeness
  - Centralized origin validation:
    - New `OriginResolverService` for validating and resolving OAuth return origins
    - Consolidates origin validation logic across auth flows
    - Supports fallback chain: validated returnOrigin → CONSUMER_APP_ORIGIN → CONSUMER_MOBILE_APP_ORIGIN → CORS_ALLOWED_ORIGINS[0]
  - Consumer mobile documents view enhancements:
    - Enhanced documents loading skeleton with realistic card-based layout
    - Upgraded documents page with sticky header and improved responsive layout
    - Card-based document grid (responsive: 1/2/3 columns)
    - Filter chips with document counts per category
    - Visual improvements: gradients, shadows, animations, better spacing
    - Enhanced empty states with icons and improved messaging
    - Better mobile scroll behavior and touch interactions
    - Improved upload button with enhanced visual feedback and progress indication
    - Document cards with improved layout, icons, and action buttons
    - Tag display with overflow handling (show first 3 + count)
    - Preview and attachment actions repositioned for better UX
  - Consumer mobile shared UI library:
    - Comprehensive icon library: 49 SVG icon components with unified `IconProps` interface
    - New shared UI components: `IconBadge` (gradient variants, sizes, rings), `PageHeader` (mobile-optimized with sticky header support), `SearchInput` (with clear button and debounced interaction)
    - Brand assets: favicon.ico and icon.svg for consumer-mobile app

  ### 🔐 Security
  - Centralized OAuth crypto utilities in `@remoola/security-utils`:
    - PKCE code verifier/challenge generation (RFC 7636)
    - OAuth state token generation with HMAC signing
    - Nonce generation for replay protection
    - SHA-256 state hashing for storage keys
  - Auditable crypto layer: all OAuth crypto calls now use centralized utilities instead of inline implementations

  ### 🧪 Testing
  - Added comprehensive test coverage for consumer-mobile:
    - `client.test.ts`: token refresh flows, SWR fetcher, fetchWithAuth, retry logic, session expiry handling
    - `middleware.test.ts`: Next.js middleware auth flows, token validation, refresh token rotation, OAuth callback handling

  ### ♻️ Refactor
  - Extracted duplicate origin validation logic into `OriginResolverService`
  - Replaced inline crypto calls in `AuthController` and `GoogleOAuthService` with `@remoola/security-utils` utilities
  - Updated `OAuthStateStoreService` to use centralized crypto helpers
  - Aligned all consumer auth services to use `OriginResolverService` for origin validation

  ### 🛠 DevEx
  - Reusable OAuth crypto utilities available in `@remoola/security-utils/oauth-crypto`:
    - `generateOAuthState()` — secure state token generation
    - `signOAuthState(state, secret)` — HMAC-SHA256 signing
    - `hashOAuthState(token)` — SHA-256 hashing for storage
    - `generateOAuthNonce()` — nonce generation
    - `generatePKCEVerifier()` — PKCE verifier
    - `generatePKCEChallenge(verifier)` — PKCE challenge (S256)
  - Updated `.env.example` files with `CONSUMER_MOBILE_APP_ORIGIN` and `ADMIN_APP_ORIGIN`
  - Added `CONSUMER_MOBILE_APP_ORIGIN` to `turbo.json` globalEnv for build-time availability

  ### 🐛 Fixed
  - Added null-safety check in `DocumentPreviewModal` to prevent rendering without valid URL
  - Fixed document preview modal only opening when URL is available
  - Added proper null-handling for document URL before preview modal invocation

</details>

<details>
<summary>2026-03-10</summary>

- **2026-03-10:**
  ### 🔐 Security
  - Auth cookie policy refactor: single source of truth for cookie names and options.
  - Shared policy in `@remoola/api-types` (http/auth-cookie-policy); API (`apps/api` shared-common), admin, consumer, and consumer-mobile use the same policy.
  - Production/Vercel uses __Host- prefixed cookie names (RFC 6265); local development uses plain names; secure/sameSite/path from policy only.

  ### 🗄 Database & Migrations
  - Migration `20260310123000_consumer_auth_sessions`: additive `auth_sessions` table for consumer auth.
  - Database-backed sessions: hashed refresh token storage, `session_family_id`, `replaced_by_id` for refresh rotation lineage, `revoked_at` and `invalidated_reason` for revocation.
  - No destructive changes to existing auth tables; allows gradual migration from legacy access/refresh flows.

  ### ♻️ Refactor
  - Cookie keys and options centralized; controllers and middleware no longer determine cookie mode.
  - Admin and consumer auth controllers, Next.js middleware and API routes (login, logout, refresh, clear-cookies, me, oauth/exchange) aligned to shared policy across apps/admin, apps/api, apps/consumer, apps/consumer-mobile.

  ### 🛠 DevEx
  - Tailwind v4 canonical class renames across apps/admin, apps/consumer, apps/consumer-mobile (outline, shadow, rounded, blur, flex, etc.; no API, DB, or ledger changes).

</details>

<details>
<summary>2026-03-11</summary>

- **2026-03-11:**
  ### 🐛 Fixes
  - **theme system (mobile):** ThemeProvider, ThemeSwitcher, ThemeSettingsForm, ThemeInitializer, ThemeColorMeta; light theme UI across layout, login, balances, exchange, dashboard, documents, payments, contracts.
  - **Signup flow:** CountrySelect, PhoneInput, libphonenumber validation, address parsing, date 18+/not future; organization size/roles and HOW other; address prefill and onBlur validation.
  - **Balance display:** Dashboard and Payments now show the same balance value. API dashboard summary used to treat ledger sum as dollars and multiply by 100; ledger stores minor units (cents), so `balanceCents` is now derived without the extra factor (apps/api consumer-dashboard).
  - **Balance format:** Negative balance displays as `-$33.00` (minus before symbol). Added `formatBalanceCurrency` and shared `BalanceCard`; Dashboard and Payments use the same card and formatting.
  - **Exchange currency (mobile):** Normalize balance API response (Record → Balance[]) so "Available" and BalancesPanel show correct data; sync AmountCurrencyInput to currency prop so dropdown stays correct after Swap; send quote/convert API body as `from`/`to`/`amount` and map responses (`sourceAmount`/`targetAmount` → `amountFrom`/`amountTo`); same-currency validation and disabled buttons; fix "Updated Invalid Date" for quote timestamp; shared types `IConsumerExchangeBalance`, `IConsumerExchangeQuote`, `IConsumerExchangeConversion` in `@remoola/api-types`. Fix double "Get quote" button (single primary when no quote; "Get new quote" + "Exchange now" when quote exists).
  - **Consumer mobile (shared UI):** Moved ConfirmationModal to shared/ui; added shared components (AlertBanner, FilterChip, IconButton, NavCard, PaginationButton, SegmentedButton, form-classes); StripeProvider; refactored documents, contacts, payments, settings, and signup views.
  - **Theme hydration (mobile):** Fixed theme flash/mismatch on load; initializer and color-meta ensure consistent theme before paint.
  ### 🛠 DevEx
  - Consumer mobile: replaced inline SVGs with shared icon components; added MapPinIcon, LinkIcon, ArrowsPointingOutIcon, PlayIcon, PauseCircleIcon (UI refactor only).

</details>

<details>
<summary>2026-03-12</summary>

- **2026-03-12:**
  ### ♻️ Refactor
  - **Consumer mobile – centralized error messaging:** New `apps/consumer-mobile/src/lib/error-messages.ts` maps API error codes (`@remoola/shared-constants`) to user-facing messages and defines local toast keys for client-side failures; 37 files switched to `getErrorMessageForUser`, `getLocalToastMessage`, and `showErrorToast` for consistent, safe user-facing toasts. No API, ledger, or migration changes.
  - **Cookie forwarding and fetch cache:** Admin proxy uses multi-cookie forwarding (`getSetCookie`/`appendSetCookies`) so all auth cookies are preserved; consumer and consumer-mobile API routes use `appendSetCookies` for all proxy responses; consumer-mobile `proxyApiRequest` and logout/middleware/documents server-action fetches use `cache: no-store`. No new packages or schema changes.
  - **BFF mutation contract hardening:** Consumer and consumer-mobile mutation proxy routes now enforce `application/json` and valid JSON payloads before forwarding; invalid content type/body returns `400` (`INVALID_CONTENT_TYPE`/`INVALID_JSON`), oversized JSON returns `413` (`PAYLOAD_TOO_LARGE`), and invoice generation accepts an empty JSON body for backward compatibility.
  - **Date normalization for `<input type="date">`:** Normalize to `yyyy-MM-dd` (toDateOnly) in consumer and consumer-mobile; new `apps/consumer-mobile/src/lib/date-utils.ts`; used in CreatePaymentRequestView, PersonalDetailsStep, DateInput, PersonalDetailsForm. No API/DB/migrations.

  ### 🔐 Security
  - **Header forwarding hardening at proxy boundaries:** Shared BFF proxy helpers now forward an explicit header allowlist (instead of broad pass-through), while preserving multi-cookie `Set-Cookie` propagation and `cache: no-store` behavior on authenticated route flows; admin proxy mutation routes now enforce JSON payload validation plus request-size limits with `413 PAYLOAD_TOO_LARGE` on oversize requests.

  ### 🛠 DevEx
  - Single source for API-code → user message and local-toast copy in consumer-mobile; add new codes/keys in `error-messages.ts` when introducing new API errors or client-side toast scenarios.

</details>

<details>
<summary>2026-03-13</summary>

- **2026-03-13:**
  ### 🚀 Feature
  - Consumer mobile UI migration to CSS Modules across app routes, feature views,
    and shared UI components; styling extracted from TSX into colocated
    `*.module.css` files with no intentional API/ledger behavior changes.
  - Shared `cn()` helper in `packages/ui` now uses `tailwind-merge` to resolve
    conflicting utility classes deterministically.

  ### 🔐 Security
  - Consumer mobile login `next` parameter is sanitized to prevent unsafe redirects
    (`http(s)://`, `//`, malformed encodings, and CRLF payloads now fall back to
    `/dashboard`).
  - Consumer mobile middleware hardening:
    - validates obvious cookie-token corruption before backend calls,
    - avoids auth-page redirect loops when access token is expired/invalid,
    - emits refresh-attempt telemetry headers (`x-remoola-auth-refresh-*`) and
      `server-timing` metrics for auth refresh observability.

  ### 🛠 DevEx
  - React/React DOM and corresponding type packages aligned to `19.2.1` across
    `apps/admin`, `apps/consumer`, `apps/consumer-mobile`, and `packages/ui`.
  - Added `typescript-plugin-css-modules` to app TS configs for CSS Module typing
    and editor diagnostics in admin, consumer, and consumer-mobile.
  - Added Yarn registry pin in root `.yarnrc.yml`
    (`npmRegistryServer: "https://registry.npmjs.org"`), with lockfile refresh.

</details>

<details>
<summary>2026-03-16</summary>

- **2026-03-16:**
  ### 🚀 Feature
  - Consumer browser identity + action tracking rollout:
    - canonical browser identity remains backend-issued `deviceId` (no parallel identity key);
    - selective endpoint tracking via `@TrackConsumerAction` + `ConsumerActionInterceptor`;
    - append-only `consumer_action_log` persistence with partition maintenance/retention scheduler support.
  - Added supporting runtime wiring and contracts for identity/logging pipeline:
    - common export wiring for decorator/interceptor/middleware indexes and bootstrap integration in `apps/api/src/main.ts`;
    - correlation-id normalization middleware hardening and corresponding middleware tests;
    - shared consumer action log service + partition utility/scheduler modules integrated into consumer auth module.

  ### 🔐 Security / Financial Safety
  - OAuth callback hardening:
    - startup now hard-fails in staging/production if `CONSUMER_OAUTH_ALLOW_MISSING_STATE_COOKIE_FALLBACK=true`;
    - runtime callback path allows missing-state-cookie fallback only in development/test; staging/production return `invalid_state`;
    - CSRF contracts for refresh/logout/logout-all preserved and covered by tests.
  - Stripe webhook top-level failure handling now emits a sanitized warning event (`stripe_webhook_processing_failed`) with class/shape metadata only (no raw error message/body in logs).
  - Hardened `StripeReversalScheduler` advisory locking to be connection-safe in pooled environments:
    - replaced session-scoped `pg_try_advisory_lock`/`pg_advisory_unlock` calls with transaction-scoped `pg_try_advisory_xact_lock` inside a single interactive Prisma transaction;
    - removed separate unlock flow and made lock lifecycle transaction-bound by PostgreSQL;
    - retained idempotent outcome writes (`createOutcomeIdempotent`) and status-aware external IDs.
  - Added scheduler transaction timeout guard (`120000ms`) to keep lock scope bounded operationally.

  ### 🗄 Database & Migrations
  - `20260316150500_enforce_ledger_entry_dispute_unique` rollout safety documented and aligned:
    - preferred path for non-empty DBs is non-transactional predeploy `CREATE UNIQUE INDEX CONCURRENTLY` followed by migration constraint attach (`UNIQUE USING INDEX`);
    - migration keeps a CI/ephemeral-safe fallback path that creates the index in-migration when missing, with lock-risk notice for non-empty databases.

  ### 🧪 Testing
  - Updated `stripe-reversal.scheduler.spec.ts` to reflect transaction-scoped locking behavior and lock-not-acquired flow under tx client mocks.
  - Verified scheduler unit tests pass after lock hardening.
  - Expanded contract coverage for browser identity and action logging:
    - deviceId middleware generation/reuse/regeneration and consumer-scope behavior;
    - consumer action interceptor success/failure/no-op semantics;
    - consumer action log service allowlist + write-failure safety;
    - auth CSRF/OAuth compatibility tests and dedicated e2e coverage for action-log and retention behavior.

  ### 📄 Documentation
  - Added/updated docs for governance-sensitive behavior and rollout:
    - `docs/CONSUMER_BROWSER_IDENTITY_TRACKING.md` now documents production OAuth fallback block, partitioned PK rationale, identifier-only dynamic SQL rationale, and rollout/runbook notes;
    - `docs/PROJECT_DOCUMENTATION.md` now reflects `ConsumerActionLogModel` partitioned PK rationale;
    - changelog entry aligned with the full change set for pre-PR doc-sync requirements.
  - Captured schema/contracts/UI alignment for this rollout:
    - `packages/database-2/prisma/schema.prisma` + migration `20260315041301_add_consumer_action_log` for append-only partitioned action log;
    - shared cookie-policy/constants updates in `packages/api-types` + `packages/shared-constants` and API wrappers;
    - consumer and consumer-mobile payment-detail idempotency/error-message updates with BFF route test coverage.

</details>

<details>
<summary>2026-03-17</summary>

- **2026-03-17:**
  ### 🚀 Feature
  - Consumer forgot-password and password-reset flow:
    - **Forgot-password:** `POST /consumer/auth/forgot-password` (email) requests a password-reset email; `GET /consumer/auth/forgot-password/verify?token=…&referer=…` validates the token and redirects to the app confirm page.
    - **Reset with token:** `POST /consumer/auth/password/reset` (token + new password) sets the new password; used from the link in the forgot-password email.
    - **Change-password (authenticated):** `PATCH /consumer/profile/password` (current password + new password) for logged-in consumers; unchanged contract, audit-aligned.
  - Mailing: forgot-password email template and transport; BFF routes for consumer and consumer-mobile for forgot-password and password/reset. DTOs: forgot-password-request, reset-password, change-password (profile). Env and shared-constants updates for consumer app origins used in reset links.

  ### 📄 Documentation
  - Changelog and canonical docs updated for forgot-password, reset-password, and change-password (consumer auth and profile).

</details>

<details>
<summary>2026-03-18</summary>

- **2026-03-18:**
  ### 🚀 Feature
  - Consumer forgot-password / reset-password completion: auth-notice type in `@remoola/api-types` for post-login/post-reset messaging; logout redirect and cookie clear behavior aligned across consumer and consumer-mobile; profile password change (consumer web + mobile) and error-message alignment; mail transport health used by forgot-password flow; reset-password token cleanup scheduler (expired token removal).
  - E2E: forgot-password and reset-password flow covered by `apps/api/test/forgot-reset-password.e2e-spec.ts`.
  - Email: migrate to Brevo API (transactional email via Brevo; optional boot-time verification `BREVO_VERIFY_ON_BOOT`; env: `BREVO_API_KEY`, `BREVO_API_BASE_URL`).
  - Email validation consolidation: single source in `@remoola/api-types` (validation/email); API shared-common validators and DTOs (auth, consumer, admin, payment, contact) and consumer/consumer-mobile signup and contact schemas aligned to shared email validation.
  - API health: `POST /health/test-email` (optional body `to`) for sending a test email via Brevo; health and Brevo mail service tests added/updated.

  ### 📄 Documentation
  - Canonical docs and changelog updated for this release (consumer auth: forgot/reset, auth-notice, logout, cookie policy, e2e; email validation consolidation; Brevo mailing).

</details>

<details>
<summary>2026-03-20</summary>

- **2026-03-20:**
  ### 🚀 Feature
  - API auth surface consolidation and hardening:
    - Register Passport `JwtStrategy` via root `JwtPassportModule`.
    - Remove Nest root `/api/auth` module; keep namespaced auth under
      `/api/admin/auth` and `/api/consumer/auth`.
    - Remove legacy Stripe payment-method metadata endpoint
      (`POST /consumer/stripe/payment-method/metadata`) and
      `getPaymentMethodMetadata` API handler.
  - Signup verification flow hardening:
    - Verify JWT tokens (`verify`) instead of decode-only handling.
    - Enforce out-of-session verification token usage.
    - Omit `email` from confirmation links; keep compatibility where successful
      redirects may still include `email` for UX.
    - Failure redirects use `verified=no`; consumer and consumer-mobile
      verification pages accept `verified` without `email`.

  ### 🔐 Security
  - Centralize outbound email API base URL resolution with
    `resolveEmailApiBaseUrl`; production now requires
    `NEST_APP_EXTERNAL_ORIGIN`.
  - Invoice email/PDF pay-online link behavior:
    optional `payOnlineUrl` is used only for absolute `http(s)` URLs;
    otherwise fallback uses `CONSUMER_APP_ORIGIN` (or local dev default).

  ### 🧪 Testing
  - Add fast API e2e profile (`packages/api-e2e/jest-e2e.fast.json`) with
    `test:e2e:fast` / `pretest:e2e:fast`.
  - Add fast test-db controls:
    `TEST_DB_FAST_REUSE` and `TEST_DB_VERBOSE` for faster local e2e loops.

  ### 📄 Documentation
  - Update docs and `.env.example` to reflect the auth surface, email base URL,
    invoice link behavior, and verification-flow changes.

</details>

<details>
<summary>2026-03-23</summary>

- **2026-03-23:**
  ### 🚀 Feature
  - Consumer Stripe Identity Verify Me lifecycle:
    - Add canonical `POST /consumer/verification/sessions` start route while keeping the legacy-compatible verify-start path delegating to the same flow.
    - Reuse an active Stripe Identity session when possible instead of always creating a new one.
    - Surface verification state across consumer dashboard and settings flows in web and consumer-mobile, including compliance-task / retry / continue-verification UX.
    - Align consumer DTOs, models, and shared verification-state helpers so API responses expose a consistent lifecycle view (`not_started`, `pending_submission`, `requires_input`, `verified`, review-negative states).

  ### 🔐 Security / Compliance
  - Stripe Identity webhook hardening:
    - managed verification lifecycle updates (`requires_input`, `verified`, `canceled`, `redacted`) now ignore stale sessions and only mutate the active consumer verification session.
    - verification success preserves existing passport / ID data instead of destructively clearing compliance-critical profile fields.
    - managed verification webhook processing is retry-safe alongside existing webhook dedupe behavior.

  ### 🗄 Database & Migrations
  - Migration `20260323120000_stripe_identity_consumer_state` adds additive consumer Stripe Identity state columns:
    - `stripe_identity_status`
    - `stripe_identity_session_id`
    - `stripe_identity_last_error_code`
    - `stripe_identity_last_error_reason`
    - `stripe_identity_started_at`
    - `stripe_identity_updated_at`
    - `stripe_identity_verified_at`
  - Add DB check constraint for allowed Stripe Identity states.
  - Rollout contract: apply the migration before API/runtime deployment because auth and consumer reads load `ConsumerModel`.

  ### 🧪 Testing
  - Add targeted unit coverage for Stripe Identity session reuse, stale-event rejection, retry-after-failure behavior, and profile-field preservation in `stripe-webhook.service.spec.ts`.
  - Add end-to-end coverage for consumer verification lifecycle in `apps/api/test/consumer-verification.e2e-spec.ts`.
  - Revalidated repo and API verification for the touched scope (lint, typecheck, targeted tests).

  ### 📄 Documentation
  - Update `docs/PROJECT_DOCUMENTATION.md` and `docs/FEATURES_CURRENT.md` for the canonical verification route, compatibility path, persisted verification state, and stale-session behavior.
  - Add rollout notes and release-gate evidence requirements for migration `20260323120000_stripe_identity_consumer_state`, including the required `migrate before runtime deploy` contract for auth and consumer reads.

</details>

<details>
<summary>2026-03-24</summary>

- **2026-03-24:**
  ### 🚀 Feature
  - Consumer web UX refresh:
    - add a command palette for page/action navigation from the shell search control;
    - use `Cmd+K` on Apple platforms and `Ctrl+/` on Linux/Windows for the global shortcut;
    - simplify mobile navigation to Home, Payments, Contacts, and Contracts, with Documents, Bank & Cards, Withdraw, Exchange, and Settings moved into a `More` drawer;
    - polish desktop sidebar labels and icon-backed navigation.
  - Consumer theme and hydration polish:
    - apply the resolved light/dark theme before paint in the root layout;
    - keep theme state aligned across `html` and `body` with reduced hydration mismatch / flash risk.
  - Consumer signup and profile UX refinement:
    - tighten calendar-based date-of-birth validation;
    - broaden address parsing to recognize US/Canada/UK/Russia/Germany formats in prefill flows, with `countryHint` support for ambiguous inputs;
    - add country-aware passport/ID placeholders and validation support;
    - refresh signup completion and verification copy for clearer success/failure states.
  - Consumer password settings and auth notice refinement:
    - support first-time password creation for Google-only / no-password accounts from Settings without requiring a current password;
    - expose `hasPassword` in the safe consumer profile payload so web/mobile can render `Set Password` versus `Change Password`;
    - add `auth_notice=password_set` alongside the existing password-changed/reset-success notices;
    - refresh password-related error copy for the new settings flow and forced re-login behavior.

  ### 📄 Documentation
  - Update `docs/FEATURES_CURRENT.md` and `docs/PROJECT_DOCUMENTATION.md` to reflect the password set/change split, `hasPassword` profile contract, `password_set` auth notice, and the broader address parsing support.

</details>

<details>
<summary>2026-03-25</summary>

- **2026-03-25:**
  ### 📦 Types & Contracts
  - Add canonical Prisma schema surface under `packages/api-types/src/schema`:
    - `prisma-generated.ts` re-exports the generated Prisma client types from `@remoola/database-2`
    - `models.ts` provides generated `...WithRelations` and composite-key helpers derived from `packages/database-2/prisma/schema.prisma`
    - `scalars.ts` adds shared Prisma-linked scalar aliases and serialized schema helper types
  - Root `@remoola/api-types` now type-re-exports the schema layer without changing existing runtime/shared contract exports.

  ### 🗄 Database & Migrations
  - No new migration or schema mutation in this change.
  - Add `db:validate` to `packages/database-2` and pin `prisma` / `@prisma/client` to `6.19.0` to keep CLI and generated client versions deterministic.
  - Rollout remains backward compatible; no migration-first deploy is required for this commit.

  ### 🛠 DevEx & Infrastructure
  - Add schema sync guardrails:
    - root scripts `schema:generate:helpers` and `schema:check`
    - `@remoola/api-types` `schema:generate`, `build`, and `typecheck` now regenerate schema helpers before compile
    - Turbo `typecheck` now depends on upstream `^build` so stale Prisma generation fails earlier
  - Add `packages/api-types/scripts/generate-schema-helpers.js` to derive helper aliases directly from the checked-in Prisma schema.

  ### 🔐 Security / Production Safety
  - Preserve the invariant that `packages/database-2/prisma/schema.prisma` remains the single source of truth for schema-derived shared types.
  - Reduce silent drift risk between Prisma schema, generated client, and exported shared helpers.
  - Keep strict `schema:check` validation as a local / PR gate and out of Vercel deploy-time install/build, so production deploys remain compile-safe and do not require DB mutation steps.

  ### 📄 Documentation
  - Document canonical/generated/hand-written boundaries and the Vercel-safe workflow in `packages/api-types/src/schema/README.md`.

</details>

<details>
<summary>2026-03-26</summary>

- **2026-03-26:**
  ### ♿ Accessibility
  - **consumer — loading fallbacks (8 pages):** Replace `aria-hidden` with `role="status"` on Suspense fallback `<p>` elements in all affected shell pages (`withdraw-transfer`, `exchange`, `exchange/rules`, `exchange/scheduled`, `payment-methods`, `contacts`, `payment-requests/new`, `payments/start`); screen readers now announce loading state; visual output unchanged.
  - **consumer — shell header search control:** Add `role="button"`, `aria-label="Open command palette"`, and `aria-haspopup="dialog"` to the readOnly search input in `(shell)/layout.tsx`; `data-testid="consumer-shell-search"`, click/keyboard behavior, and palette open logic untouched.
  - **consumer — More Actions dropdown state:** Add `aria-expanded={actionsOpen}`, `aria-haspopup="true"`, and `aria-controls` + matching `id` to the More Actions button in `CreatePaymentRequestForm` and `StartPaymentForm`; toggle behavior, outside-click close, submit flow, and API payload shape unchanged.
  - **consumer — settings loading branch:** Wrap loading `<p>` in `ProfileSettingsClient` with `role="status" aria-live="polite"`; add `role="alert"` to the error branch and `role="status" aria-live="polite"` to the unauthorized branch; `data-testid` values `settings-ready`, `settings-error`, `settings-unauthorized` preserved; fetch sequence and session-expired redirect untouched.
  - **consumer-mobile — bottom nav:** Add `aria-current="page"` to the active `Link` in `ShellNav.tsx`; active visual styling, `data-testid`, and `href` values unchanged.

  ### 🚀 Feature
  - **consumer-mobile — route-level loading for `payment-requests/new`:** Add `loading.tsx` + `loading.module.css` with animated pulse skeleton consistent with neighboring shell routes; `page.tsx` and `data-testid="consumer-mobile-payment-request-new"` untouched.
  - **consumer-mobile — dashboard error branch retry:** Add "Try again" link in `DashboardView` when `data === null`; hard-navigates to `/dashboard` to force a server component re-fetch; `getDashboardData()` contract and the success branch unchanged; new `.retryLink` style added to `DashboardView.module.css`.

  ### 🐛 Fixed
  - **consumer-mobile — not-found CTA:** Change CTA target from `/` to `/dashboard` to eliminate the redundant redirect hop; auth redirect behavior unchanged.
  - **consumer-mobile — dashboard empty-state link:** Replace `<a href="/payment-requests/new">` with `<Link>` for client-side navigation consistency.
  - **consumer-mobile — header top safe-area:** Split `py-3` into `pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]` in `ShellNav.module.css`; respects existing `viewportFit: cover`; non-notch devices see no visual change; tap targets preserved.

</details>

<details>
<summary>2026-03-27</summary>

- **2026-03-27:**
  ### ♿ Accessibility
  - **consumer-mobile — auth loading fallbacks:** Add `role="status" aria-live="polite"` to the `Suspense` fallback text in `app/auth/callback/page.tsx` and `app/(auth)/signup/verification/page.tsx`; auth flow and route structure unchanged.
  - **consumer — loading/status leftovers:** Add `role="status" aria-live="polite"` to the remaining plain loading states in `components/payments/PaymentView.tsx`, `components/exchange/BalancesPanel.tsx`, `app/auth/callback/page.tsx`, and `app/(auth)/signup/verification/page.tsx`; fetch/data flow and visual behavior preserved.
  - **consumer-mobile — app-level error fallback:** Align `AppErrorBoundary` with shared `ErrorState`; keep retry behavior as `window.location.reload()` and remove the now-unused custom fallback styles from `AppProviders.module.css`.

  ### 🐛 Fixed
  - **consumer — mobile More drawer runtime state:** Stabilize drawer open/close handling in `(shell)/layout.tsx`:
    - move `Escape` close handling to shell-level state management;
    - make `aria-expanded` explicitly reflect `moreOpen`;
    - keep `aria-haspopup="dialog"` / `aria-controls="mobile-more-drawer"` on the trigger;
    - close the drawer on route change;
    - make the backdrop an explicit close control with an accessible name.
  - **consumer-mobile — signup start navigation:** Replace the internal `Sign in` raw anchor in `features/signup/SignupStartView.tsx` with `next/link`; keep the same `href`, text, and styling.

  ### 🔐 Security / Production Safety
  - Preserve auth, session, routing, and API request invariants; all changes stay inside frontend accessibility, navigation primitives, and shell UI state handling.
  - Reduce drift between visible mobile drawer state and accessibility state in the consumer shell.

</details>

<details>
<summary>2026-03-30</summary>

- **2026-03-30:**
  ### ♿ Accessibility
  - **consumer-web shell and forms:** Add a skip link to `(shell)/layout.tsx` and restore explicit `label`/`input` association in `components/ui/FormInput.tsx`; keyboard navigation and screen-reader flow now reach main content and form controls more reliably without changing route structure or submit behavior.
  - **consumer-mobile auth and error boundaries:** Keep login auxiliary controls in the natural tab order, add `role="status" aria-live="polite"` to signup Suspense fallbacks, and align `app/error.tsx` plus `app/(auth)/error.tsx` to the shared `ErrorState` component with the same retry semantics.

  ### 🐛 Fixed
  - **consumer-web first-load state handling:** Align contacts, contracts, documents, exchange balances, payment methods, and payments with explicit loading/error/empty branches:
    - contacts and contracts render skeleton/loading UI instead of premature empty states;
    - documents distinguish initial load, retryable load failure, and true empty results;
    - exchange balances no longer treat an empty balance map as an infinite loading state, preserve the same retry path in both exchange and withdraw/transfer views, and normalize compatible balance payloads without misreading `amountCents` as whole currency units;
    - payment methods use `SkeletonTable` for first load and shared `ErrorState` for initial fetch failures;
    - payments reuse shared `ErrorState` while preserving existing reload-based retry behavior.
  - **consumer-mobile shared navigation and documents UI:** Route internal `EmptyState` CTAs through `next/link` for client-side navigation consistency and remove the duplicated all-documents empty branch in `EnhancedDocumentsView` while preserving existing copy and upload flow.

  ### 🔐 Security / Production Safety
  - Preserve auth, session, cookie, CSRF, payment, ledger, and API contract invariants; the change set stays inside frontend presentation, accessibility semantics, and client-side state handling.
  - Reduce production UX risk by separating first-load, empty, and retry states without changing backend endpoints, mutation payloads, or payment-side behavior.
  - Keep balance compatibility handling in the frontend adapter layer rather than broadening backend contract changes, and avoid false empty-state flashes while session-expired redirects are in progress.

</details>

<details>
<summary>2026-03-31</summary>

- **2026-03-31:**
  ### ♿ Accessibility
  - **consumer-mobile auth and contacts loading fallbacks:** Add `role="status" aria-live="polite"` to the remaining auth and contacts route fallbacks in `app/(auth)/forgot-password/confirm/page.tsx`, `app/(auth)/login/page.tsx`, `app/(auth)/login/loading.tsx`, and `app/(shell)/contacts/page.tsx`; spinner-only states now hide decorative spinners from assistive tech while preserving the same visual loading pattern.
  - **consumer-web route metadata and error-state alignment:** Add static page titles for `contracts`, `settings`, `payments/[paymentRequestId]`, and `contacts/[id]/details`; add contextual `aria-label` values to `components/ui/PaginationBar.tsx`; align `app/error.tsx`, `app/(shell)/error.tsx`, and `app/global-error.tsx` on the shared `ErrorState` pattern while preserving retry semantics and existing test ids.
  - **consumer-mobile state feedback and empty-state consistency:** Replace the incorrect `PAYMENT_NOT_FOUND` toast on payment-method load failure with a payment-method-specific message, distinguish unavailable vs zero vs non-zero balance display in `features/payments/ui/WithdrawTransferView.tsx`, and switch the contacts zero-state in `features/contacts/ui/ContactsListView.tsx` to the shared `EmptyState` component while keeping the same modal-open CTA.
  - **consumer-web auth loading and callback status:** Add `aria-atomic="true"` and normalize loading/status copy in `app/auth/callback/page.tsx`, `app/auth/callback/AuthCallback.tsx`, and `app/(auth)/signup/verification/page.tsx`; OAuth polling, timeout, and redirect targets remain unchanged while callback status is announced more reliably.
  - **consumer-mobile auth callback status:** Add `role="status" aria-live="polite" aria-atomic="true"` to `app/auth/callback/AuthCallback.tsx`; the visible redirect flow stays the same.
  - **consumer-web shell state feedback:** Normalize inline loading copy in `app/(shell)/contacts/page.tsx` and `app/(shell)/payment-methods/page.tsx`, deduplicate the identical loading branch in `app/(shell)/settings/components/ProfileSettingsClient.tsx`, and add client-side logging parity to `app/global-error.tsx` without changing `LoadState`, retry semantics, or standalone global-error structure.
  - **consumer-mobile empty-state and settings feedback:** Replace the custom search-empty branches in `features/payments/ui/PaymentsListView.tsx` and `features/contracts/ui/ContractsListView.tsx` with shared `EmptyState`, and align pending settings banners in `ThemeSettingsForm.tsx` and `PreferredCurrencyForm.tsx` to `Saving...` without changing filters, pagination, settings actions, or toast behavior.
  - **consumer-web auth and loading announcements:** Add live-region semantics to `app/login/page.tsx`, `components/ui/Skeleton.tsx`, and `components/payments/PaymentView.tsx`, and clarify the command-palette search label in `components/ui/CommandPalette.tsx`; loading and not-found states are now announced more reliably without changing auth, dashboard, or payment behavior.
  - **consumer-mobile loading and search semantics:** Add status semantics to `app/loading.tsx`, add `aria-label` support to `shared/ui/SearchInput.tsx`, and keep pagination controls in `features/contracts/ui/ContractsListView.tsx` explicitly non-submit buttons so search and paging remain accessible without altering data flow.

  ### 🐛 Fixed
  - **consumer-web login and shell search UX:** Remove seeded `user@example.com` / `password` defaults from `app/login/LoginForm.tsx` and update the shell search trigger copy in `app/(shell)/layout.tsx` to `Open command palette...` without changing login submit flow, command-palette behavior, keyboard shortcuts, or `data-testid` contracts.
  - **consumer-mobile documents empty state:** Remove the redundant all-documents empty wrapper in `features/documents/ui/EnhancedDocumentsView.tsx` and keep `EmptyState` as the single source of empty-state markup; copy, upload flow, filtered-empty behavior, and document actions remain unchanged.
  - **consumer-web auth metadata and root error theme bootstrap:** Add route-specific metadata titles for `login`, `forgot-password`, `forgot-password/confirm`, and `auth/callback`, and harden `app/global-error.tsx` so stored light/dark theme is applied on first render while preserving root retry semantics and error logging.
  - **consumer-mobile exchange and dashboard recovery paths:** Align `(shell)/exchange/page.tsx` with the backend batch-rates response so the standalone rates panel renders again, keep `features/exchange/ui/RatesPanel.tsx` on soft `router.refresh()`, add a back-link in `features/payments/ui/PaymentDetailView.tsx`, and preserve the soft retry path through `features/dashboard/ui/DashboardRetryButton.tsx`.
  - **consumer-web root error blast-radius reduction:** Narrow the root layout import graph by replacing the `../components` barrel import with direct imports for `ThemeProvider`, `SWRProvider`, and `PageErrorBoundary`; move `ThemeInitializer` from `app/layout.tsx` into `app/(shell)/layout.tsx`; add `app/error.tsx` and `app/(shell)/error.tsx`; wrap `DocumentsList` and `PaymentMethodsPageClient` in `SectionErrorBoundary`; and keep `app/global-error.tsx` self-contained so non-root failures are caught before they escalate to the root boundary.
  - **consumer-web dashboard load throttling and theme request budget:** Keep pending withdrawals inside `/api/dashboard`, add lightweight upstream-status diagnostics in `app/api/dashboard/route.ts`, avoid an extra `GET /api/settings/theme` on dashboard shell mount when a valid local theme snapshot already exists, and remove eager protected-route `consumer/auth/me` validation on healthy page hits in `middleware.ts`; direct `/dashboard` and `/ -> /dashboard` loads now complete without the previously observed `429` burst while dashboard content, theme persistence, and settings sync remain intact.

  ### 🔐 Security / Production Safety
  - Preserve auth, session, cookie, CSRF, redirect, OAuth, and API contract invariants across both frontend apps; no DTO, route, header, or backend behavior changes are introduced.
  - Reduce production risk in `apps/consumer` by narrowing root-error blast radius, keeping more failures inside app, shell, and section boundaries, and preserving existing retry and redirect behavior.
  - Keep payment, Stripe, idempotency, and exchange safety unchanged; touched mobile fixes stay on frontend rendering and recovery paths without changing API routes, mutation payloads, or execution flow.
  - Reduce dashboard-load request bursts in `consumer-web` without changing backend contracts: healthy protected pages still require valid-looking auth cookies, expired sessions still use the existing `401 -> refresh -> redirect` path, and dashboard upstream diagnostics remain local debugging metadata only.

</details>

</details>

---

<details open>
<summary><strong>Changelog (April 2026)</strong></summary>

# Changelog (April 2026)

<details open>
<summary>2026-04-03</summary>

- **2026-04-03:**
  ### 🔐 Security
  - **Cookie-first browser auth hardening (admin + consumer apps):**
    - align `apps/api`, `apps/admin`, `apps/consumer`, and `apps/consumer-mobile` on cookie-backed login, refresh, logout, and `/me` flows;
    - browser-facing auth responses now establish server-side access, refresh, and CSRF cookies and return `ok`-style payloads instead of exposing browser auth tokens in JSON;
    - authenticated auth mutations now require trusted `Origin`/`Referer` resolution plus matching `x-csrf-token` and CSRF cookie parity;
    - refresh tokens are signed and verified only with `JWT_REFRESH_SECRET`, and runtime validation now rejects deployments where access and refresh secrets are the same.
  - **Per-app cookie namespace isolation:** Admin, consumer-web, and consumer-mobile now resolve cookie scope from the owning app/runtime so browser sessions do not read, refresh, or clear another app's auth cookies as a fallback.
  - **Trust-boundary reduction at BFF/auth edges:** Browser-facing auth stays cookie-first end-to-end; BFF auth routes forward only trusted auth headers, preserve multi-cookie `Set-Cookie` propagation, and do not widen browser auth through client-supplied `Authorization` forwarding.
  - **OAuth invariants preserved while hardening callback flow:** Consumer browser auth replaces the old exchange-token callback step with single-use OAuth handoff completion and signup-session establishment, preserving one-time state/handoff consumption while reducing cross-origin cookie fragility.

  ### ♻️ Refactor
  - **Middleware + route alignment across admin and consumer frontends:** Next.js middleware now reads scoped cookie keys, probes or refreshes cookie sessions before redirecting, clears stale auth cookies on session-expired paths, and avoids auth-page redirect loops caused by expired or malformed browser cookies.
  - **Frontend auth UX alignment:** Auth callback clients now use bounded session polling after OAuth completion; consumer and consumer-mobile signup flows can resume from app-owned Google signup session state; logout-all and auth-notice flows now route users through explicit re-auth states after password changes or full-session revocation.
  - **Shared auth contracts in `@remoola/api-types`:** Expanded cookie-policy helpers, auth notices, OAuth helpers, and scoped cookie-key resolution so API and frontend apps consume the same browser-auth contract from a single source of truth.

  ### 🛠 DevEx
  - **Swagger cookie-auth workflow:** `apps/api` admin and consumer docs are now cookie-first for same-origin testing, including automatic CSRF header mirroring for protected mutation routes from the docs UI.
  - **Lint/tooling alignment:** App lint scripts now run ESLint directly, shared ESLint config correctly includes `eslint.config.mjs`, and Turbo env passthrough includes the additional consumer frontend origin needed by the hardened auth/origin flow.

  ### 📄 Documentation
  - Updated auth/runbook documentation to match the rollout:
    - `docs/CONSUMER_AUTH_COOKIE_POLICY.md` for per-app cookie namespaces and cookie-first BFF rules;
    - `docs/SWAGGER_COOKIE_AUTH_USAGE.md` for same-origin cookie-auth testing;
    - `docs/API_V2_PRODUCTION_RELEASE_GATE.md`, `docs/FEATURES_CURRENT.md`, `docs/PROJECT_DOCUMENTATION.md`, and `docs/FINANCIAL_SAFETY_AND_DB_COMPLIANCE.md` for distinct JWT secrets, origin + CSRF requirements, and browser-auth boundary expectations.
  - No database migration introduced in this change; rollout remains config- and contract-sensitive because cookie names, OAuth callback parameters, trusted origins, and JWT secret separation must be deployed consistently across the touched admin and consumer apps.

</details>

</details>
