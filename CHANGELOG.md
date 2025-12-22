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



```
