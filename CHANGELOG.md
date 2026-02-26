```
# Changelog (September 2025)

-   **2025-09-01:** Initial analysis of the 3 separate repositories.
-   **2025-09-02:** Created new Turborepo structure with `apps/` and `packages/`.
                    Added base `turbo.json`.
-   **2025-09-03:** Migrated first repository (`backend-nestjs`) into `apps/backend`.
                    Verified build.
-   **2025-09-04:** Migrated second repository (`frontend-nextjs`) into `apps/frontend`.
                    Fixed ESLint/TS issues.
-   **2025-09-05:** Migrated shared library repo into `packages/ui` and `packages/utils`.
                    Linked via workspaces.
-   **2025-09-08:** Integrated NestJS modules from old repos into monorepo.
-   **2025-09-09:** Fixed TypeORM migrations (UUID migration, FK adjustments).
-   **2025-09-10:** Standardized DTOs, validation decorators.
-   **2025-09-11:** Integrated shared utils/UI libs into Next.js frontend.
-   **2025-09-12:** Fixed aliasing issues (`@/utils`, `@/ui`), standardized API client
                    with OpenAPI.
-   **2025-09-15:** Start Implementing **role-based management** system,
                    allowing **super admin to assign and manage admin roles**.
                    Defined DB schema changes and initial service structure.
-   **2025-09-16:** Continued development of role-based management.
-   **2025-09-17:** Continued development of role-based management.
-   **2025-09-18:** Removed legacy configs from old repos, cleaned unused files.
-   **2025-09-19:** Added Husky + lint-staged for pre-commit checks.
-   **2025-09-22:** Fixed path alias issues and Webpack/Turbo config.
-   **2025-09-23:** Standardized API client usage with OpenAPI-generated types.
-   **2025-09-24:** Fixed mismatched dependencies (React versions, NestJS peer deps).
-   **2025-09-25:** Continued development of role-based management.
-   **2025-09-26:** Continued development of role-based management.
-   **2025-09-29:** Continued development of role-based management.
-   **2025-09-30:** Continued development of role-based management.

# Changelog (October 2025)

-   **2025-10-02:** Increased monorepo stability; fixed module import issues
                    and improved concurrent dev experience.
-   **2025-10-03:** Implemented role-based access control:
                    superadmin`s manage admins/clients, admins manage clients only.
-   **2025-10-06:** Added unified global search service across entities
                    with optimized SQL and simplified payloads.
-   **2025-10-07:** Introduced `v1` versioned routing for admin and consumer APIs
                    reorganized module structure.
-   **2025-10-08:** Implemented `/v1/admin/clients/:clientId` backend endpoints
                    for detailed client lookup.
-   **2025-10-09:** Upgraded OpenAPI spec to `v1` with enhanced schemas
                    and versioned endpoints.
-   **2025-10-10:** Standardized all admin routes under `/admin/admins`.
-   **2025-10-13:** Unified API documentation and Swagger with version switching;
                    improved visibility across all modules.
-   **2025-10-14:** Split monolithic `AdminService` into modular domain-specific
                    services for admins, clients, payments, etc.
-   **2025-10-15:** Improved developer tooling by creating shared ESLint config and
                    fixing Turborepo workspace issues.
-   **2025-10-16:** Refactored API client to use relative path prefixes for better
                    environment portability.
-   **2025-10-17:** Implemented versioned IndexedDB wrapper for offline caching with
                    schema migrations and auto-cleanup.
-   **2025-10-20:** Rebuilt API client with caching, SWR, retries, and concurrency limiting;
                    added dependency-based invalidation.
-   **2025-10-21:** Simplified global search return value by removing unnecessary
                    wrapper objects.
-   **2025-10-22:** Added admin-facing pages for managing clients with search and
                    filtering integrated into new API.
-   **2025-10-23:** Introduced shared `@remoola/env` package for centralized environment
                    configuration using Zod validation.
-   **2025-10-24:** Replaced local `.env` loaders across apps with
                    unified `@remoola/env` import; removed redundant logic.
-   **2025-10-28:** Performed multiple Vercel deployment iterations (v3–v12);
                    reverted and retested deploy 6; improved Turbo + Vercel integration;
                    merged `api-versioning` branch; stabilized deployment and
                    routing configuration.
-   **2025-10-29:** Restructured repository and cleaned up API and Turbo configuration;
                    resolved Vercel cookie/domain issues; fixed routing and parameter handling;
                    improved OpenAPI generation and migration setup; enhanced
                    debugging and ESLint configuration; finalized admin and frontend
                    integration.
-   **2025-10-30:** Updated migrations and schema configuration for Wirebill;
                    added schedule modules; removed deprecated OpenAPI and web code;
                    cleaned redundant extras; improved consumer package references;
                    fixed ORM configuration and deployment stability.
-   **2025-10-31:** Finalized minor adjustments and cleanup related to recent
                    integration work. Continue moving api

# Changelog (November 2025)

-   **2025-11-03:** Reorganized signup types by splitting the monolithic file into focused
                    modules and consolidating imports through a centralized index.
-   **2025-11-04:** Renamed form sections and step identifiers to descriptive names,
                    updated step naming (e.g., SIGNUP → SIGNUP_DETAILS), and removed debug logs.
-   **2025-11-05:** Updated Consumer schema with cascade deletes and field restructuring.
-   **2025-11-06:** Cleaned up unused files and dependencies across the consumer module
                    and signup flow.
-   **2025-11-07:** Replaced custom signup components with reusable shared UI components from
                    the design system.
-   **2025-11-10:** Implemented full multi-step signup flow for contractors and businesses,
                    added email templates, introduced Prisma error handling with detailed
                    validation messages, implemented secure cookie-based auth, added
                    comprehensive client-side validation, and created reusable UI components.
-   **2025-11-11:** Refined multi-step signup validation and improved frontend–backend consistency.
-   **2025-11-12:** Enhanced backend validation and standardized error handling across signup
                    steps.
-   **2025-11-13:** Expanded consumer API layer and improved backend support for the multi-step
                    signup workflow.
-   **2025-11-14:** Improved signup backend logic, aligned step validation, and refined profile
                    creation integration.
-   **2025-11-17:** Performed additional refactoring of signup domain logic and standardized
                    step data structures.
-   **2025-11-18:** Prepared controller and routing architecture for signup consolidation.
-   **2025-11-19:** Refactored signup architecture by modularizing types, renaming sections and
                    steps, and removing legacy components.
-   **2025-11-20:** Aligned codebase with the new type structure and fixed inconsistencies after
                    the refactor.
-   **2025-11-21:** Cleaned up deprecated signup flows, DTOs, and services ahead of final
                    controller consolidation.
-   **2025-11-24:** Consolidated all signup endpoints into `AuthController`, removed duplicate
                    controllers and services, updated route to `/auth/signup`, unified profile
                    creation flow, updated frontend calls.
-   **2025-11-25:** Updated consumer API and site modules, added tagging support, and prepared
                    consumer-facing components for upcoming functionality.
-   **2025-11-26:** Added consumer payment methods module with full Stripe integration,
                    implemented consumer contacts UI, performed consumer site updates.
-   **2025-11-28:** “Verify Me” functionality, identity verification flow for consumers.



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
                  across controllers with import cleanup, updated Stripe webhook service signature, and move Stripe endpoints
                  from payment-methods into a dedicated Stripe controller.


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


# Changelog (February 2026)

- **2026-02-02:** Added admin payment reversals (refund + chargeback actions),
                  implemented Stripe refund support, handled dispute webhooks,
                  captured reversal metadata, added idempotent reversal writes,
                  and introduced a refund reconciliation scheduler.

- **2026-02-03:** Added refund and chargeback email templates with notification
                  wiring, implemented admin/consumer API routes and UI for
                  reversals, and fixed multiple `useEffect` dependency loops.

- **2026-02-04:** Updated documentation to cover payment reversal logic and
                  exchange rate management features.

- **2026-02-05:** Added reusable UI components and utilities including `FormInput`,
                  `DateInput`, `DataTable`, and `ErrorState`; replaced inline inputs
                  and custom tables across signup and settings forms; improved
                  date-of-birth validation (age + format checks); introduced locale-
                  aware date utilities and added `react-datepicker` dependency;
                  updated project scripts and documentation.

- **2026-02-07:** Fixed consumer signup process issues and stabilized validation flow.

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

- **2026-02-17:**
                  **🚀 Feature**
                  - Scaffolded new shared `@remoola/api-types` workspace package
                    with domain modules: common / auth / payments / contacts / http
                  - Expanded cross-app adoption of shared type contracts
                  - Replaced `uuid` with Node `crypto.randomUUID()` to simplify runtime

                  **🔐 Security**
                  - Hardened Google OAuth for Vercel:
                    - Moved OAuth `state` to one-time server-side storage
                    - Fixed `invalid_state` production issues
                    - Enforced stricter refresh/logout behavior
                    - Deprecated legacy token-post OAuth endpoints
                  - Tightened CORS, cookie, and proxy configuration for Vercel
                  - Centralized environment validation and secure cookie handling

                  **📦 Types & Contracts**
                  - Migrated admin & consumer auth/signup/payment unions to `@remoola/api-types`
                  - Centralized auth cookie keys under shared http module
                  - Standardized API/SWR typing to `ApiResponseShape`
                  - Removed duplicated literal unions and legacy auth type files
                  - Reduced frontend/backend contract drift with shared exports

                  **🛠 DevEx**
                  - Simplified Vercel bootstrap guards
                  - Replaced raw `process.env` access with validated `envs` usage
                  - Added Vercel origins to global CORS configuration
                  - Required `AWS_BUCKET` for Vercel file uploads
                  - Updated turbo globalEnv configuration

                  **🧹 Cleanup**
                  - Removed unused runtime dependencies across API, frontend, database, and root workspace
                  - Pruned unreferenced API files
                  - Refreshed lockfile to reduce dependency surface
                  - Removed obsolete exports and unused env variables

- **2026-02-18:**
                  **🚀 Feature**
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

                  **🔐 Security**
                  - Preserve ledger invariants while enabling email-only payers
                  - Add regression tests to prevent ledger anomalies
                  - Redact recipient details from mailer success logs
                  - Extract password hashing & verification utilities into `security-utils` package
                  - Enforce strict DB isolation for test runs to prevent accidental prod/dev cross-use

                  **📦 Types & Contracts**
                  - Tighten auth typing with explicit DTO usage
                  - Replace untyped login bodies with structured DTOs
                  - Use `NotFoundException` for safer contact lookups
                  - Align Prisma schema with production-safe migrations:
                    - Backfill tag timestamps
                    - Convert string columns to `TEXT`
                    - Enable `pgcrypto` UUID defaults
                    - Add missing `billing_details_id` index
                    - Prevent schema drift

                  **🛠 DevEx**
                  - Harden Turbo/Vercel build scope:
                    - Remove test-only workspaces from app devDependencies
                    - Prevent CI/npm resolution failures for private workspace packages
                  - Switch consumer Jest config to shared `@remoola/jest-config`
                  - Add PostgreSQL design rules documentation
                  - Add `ADMIN_APP_ORIGIN` to turbo global environment

                  **🧹 Cleanup**
                  - Remove noisy debug logs from consumer API routes
                  - Remove unnecessary Next.js transpilation for admin

- **2026-02-19:**
                  **🚀 Feature**
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

                  **🔐 Security**
                  - Enforce non-negative consumer balances (exchange + reversals)
                  - Add advisory locks + balance re-check inside transaction
                  - Stripe reversals throw 503 for retry safety on insufficient balance
                  - Harden PaymentRequest + Ledger idempotency:
                    - Add idempotency keys to ledger entries
                    - Make duplicate webhook/payment retries no-ops
                  - Stripe amount calculation by currency fraction digits (fix JPY & non-2-decimal currencies)
                  - Replace Redis OAuth state store with DB-backed secure implementation

                  **📦 Types & Contracts**
                  - Add admin list DTOs and query types in `@remoola/api-types`
                  - Standardize paginated responses `{ items, total, page, pageSize }`
                  - Add canonical error codes package and map to consumer-facing messages
                  - Fix DTO whitelist using `@Expose()`
                  - Remove legacy/unused DTOs and barrel exports
                  - Default pageSize 10 across admin list endpoints

                  **🛠 DevEx**
                  - Add regression tests for:
                    - Ledger balance correctness
                    - Bounded history queries
                    - Admin pagination
                    - Withdraw/transfer idempotency
                  - Cap findMany queries to prevent unbounded reads
                  - Run Vercel guard build via Turbo to ensure proper package build order
                  - Add bounded `take` limits (500 / 2000 caps)
                  - Improve Next.js SSR hydration (stable FormSelect instanceId)

                  **🧹 Cleanup**
                  - Remove Redis, ioredis, and REDIS_* env vars
                  - Drop unused DTOs and dead code
                  - Remove unused admin perf helpers
                  - Fix UUID query filters (use equals instead of contains)
                  - Minor formatting and dependency cleanup

- **2026-02-20:**
                  **🚀 Feature**
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

                  **🔐 Security**
                  - Add login audit tracking and account lockout protections
                  - Improve auth refresh + session-expired handling logic
                  - Enforce currency allowlist via shared api-types contracts

                  **📦 Types & Contracts**
                  - Add `PaginatedResponsePage` to `@remoola/api-types`
                  - Centralize currency types in shared package
                  - Add consumer settings types to shared contracts
                  - Remove hardcoded currency arrays across apps

                  **🛠 DevEx**
                  - Add new `db-fixtures` workspace package with CLI and seed utilities
                  - Sync and expand documentation:
                    - Update README repo layout
                    - Align PROJECT_DOCUMENTATION with current API/DB state
                    - Refresh FEATURES_CURRENT
                    - Add `PROJECT_SUMMARY.md`
                  - Update docs to reflect OAuth routes, expectation archive,
                    package structure, DB models/enums

                  **🧹 Cleanup**
                  - Remove hardcoded CURRENCIES constants
                  - Align UI structure and table wrapping patterns
                  - Minor formatting and structural improvements

- **2026-02-24:**
                  **🚀 Feature**
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

                  **🔐 Security**
                  - Add `@Throttle` protection to refund and chargeback endpoints
                  - Restore strict validation for Google Sign-In credentials
                    (`@IsString()` enforcement)
                  - Improve null/undefined sanitization via hardened `remove-nill`
                    recursive cleanup logic

                  **📦 Types & Contracts**
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

                  **🛠 DevEx**
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

                  **🧹 Cleanup**
                  - Remove legacy `entry.ts` exports from api-types
                  - Reorder barrel exports for clearer module structure
                  - Fix typo `geyById` → `getById`
                  - Improve typing safety using `Record<string, unknown>`
                  - Align imports across apps to shared constants

- **2026-02-25:**
                **🚀 Feature — Financial Safety Architecture**
                - Introduce append-only financial ledger model via `LedgerEntryOutcome`
                  (ledger entries are no longer mutated)
                - Derive effective ledger state from latest outcome using PostgreSQL
                  `LATERAL` queries
                - Align admin ledger and payment-request services with outcome-based
                  balance calculations
                - Update Stripe payout, verification, and payment-intent handlers
                  to append outcomes instead of modifying ledger rows

                **🔐 Financial & Concurrency Safety**
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

                **🗄 Database & Migrations**
                - Add append-only ledger migration:
                  - `ledger_entry_outcome_append_only`
                - Add webhook deduplication migration:
                  - `stripe_webhook_event_dedup`
                - Standardize schema naming:
                  - `standardize_columns_snake_case`
                - Apply Prisma `@map("snake_case")` alignment for remaining columns
                - Add migration READMEs under
                  `packages/database-2/prisma/migrations`

                **🧪 Testing & Reliability**
                - Add concurrency test coverage:
                  - `consumer-exchange.concurrency.spec`
                  - `consumer-payments.concurrency.spec`
                - Add `critical-updates.e2e-spec`
                - Promote temporary DB isolation tests into full e2e test suite
                - Strengthen financial race-condition validation scenarios

                **🛠 DevEx & Documentation**
                - Add financial architecture documentation:
                  `docs/FINANCIAL_SAFETY_AND_DB_COMPLIANCE.md`
                - Move major project documentation into `/docs`:
                  - FEATURES_CURRENT
                  - PROJECT_DOCUMENTATION
                  - PROJECT_SUMMARY
                - Refresh PostgreSQL design rules documentation
                - Improve application health checks and bootstrap process

                **🧹 Cleanup & Alignment**
                - Update consumer profile DTOs and profile service alignment
                - Improve `OrganizationDetailsForm` handling
                - Adjust Turbo build configuration and Jest e2e setup
                - Normalize schema and service consistency across admin,
                  consumer, and API modules

- **2026-02-26:**
                **🚀 Feature**
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

                **🔐 Security / Financial Safety**
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

                **🗄 Database & Migrations**
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

                **📦 Types & Contracts**
                - Admin, consumer, Stripe flows use `requesterEmail` and handle
                  null `requesterId`; shared shapes aligned for pay-by-email

                **🧪 Testing & Reliability**
                - Exchange: getBalanceByCurrency and concurrency specs
                  (effective status, $executeRaw, balance without FOR UPDATE)
                - Payments: startPayment unit tests (registered, unregistered,
                  self-by-id, self-by-email, invalid amount); transfer happy
                  path; concurrency specs (advisory lock + balance check)
                - Existing coverage for reversals and dashboard preserved
                - Concurrency tests cover advisory lock and balance-check races

                **🛠 DevEx & Infrastructure**
                - test-db: PrismaClient datasourceUrl; Jest cache false
                - API e2e: config path updated
                - docs/project-design-rules.md added
                - db-fixtures and seed comments updated

                **🧹 Cleanup**
                - None
```
