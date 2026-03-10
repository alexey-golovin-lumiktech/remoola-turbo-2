# Changelog

- [September 2025](#changelog-september-2025) · [October 2025](#changelog-october-2025) · [November 2025](#changelog-november-2025) · [December 2025](#changelog-december-2025) · [January 2026](#changelog-january-2026) · [February 2026](#changelog-february-2026) · [March 2026](#changelog-march-2026)

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
  - Ledger & payment idempotency (docs/LEDGER_PAYMENT_AUDIT.md): outcome
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
  - `docs/LEDGER_PAYMENT_AUDIT.md`: ledger append-only note updated; production
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

<details open>
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

</details>
