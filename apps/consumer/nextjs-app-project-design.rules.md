# Next.js App Project Design Rules (App Router, Strict)

These rules are intended to keep a Next.js **App Router** codebase clean, scalable, and hard to break.  
Assume a modern Next.js setup with React Server Components (RSC), route handlers, and optional server actions.

---

## 0) Prime Directive

1. **Make the smallest correct change.** Avoid refactors unrelated to the task.
2. Prefer **existing repo patterns** over generic “best practices”.
3. **Correct-by-default > clever.** If a rule is unclear, choose the safer option (server-side, validated, explicit).
4. **Consistency beats preference.** One approach per problem (errors, fetching, auth, caching, tests).

---

## 1) Boundaries & Architecture (Non‑Negotiable)

### 1.1 One-direction dependency graph
- **`app/` → `features/` → `shared/` → `lib/`**
- Never import “up” the stack (e.g., `lib/` importing from `features/`).

### 1.2 Monorepo boundaries (if applicable)
- **No cross-app imports** (e.g., `apps/consumer` must not import from `apps/admin`).
- Shared types/contracts belong in a shared package/module (e.g., `packages/api-types`) rather than copied.

### 1.3 Feature ownership
- Each domain feature owns its UI + server actions + validators + server queries:
  - `features/<domain>/ui/*`
  - `features/<domain>/actions.ts`
  - `features/<domain>/queries.ts`
  - `features/<domain>/schemas.ts`

### 1.4 Public API per folder
- Use `index.ts` only at **module boundaries** to control public exports.
- Avoid “barrel everywhere” patterns that hide dependency direction.

### 1.5 No “utils dump”
- Utilities must live close to the feature or be promoted to `shared/` with tests.
- If a helper grows, it becomes a named module with a clear responsibility.

---

## 2) Server vs Client Rules (App Router Discipline)

### 2.1 Server Components by default
- Everything is a **Server Component** unless you **must** use the browser.
- `"use client"` is allowed only for:
  - event handlers (`onClick`, controlled forms, local UI state)
  - `useEffect`, browser APIs
  - client-only libraries (charts, maps, realtime SDKs)

### 2.2 Keep `"use client"` leaf-level
- Don’t add `"use client"` at route roots (`app/layout.tsx`, large page shells).
- Push client components down the tree as far as possible.

### 2.3 Hard separation: server-only vs client-only
- Server-only code lives in:
  - `**/*.server.ts` (or `/server/*`)
  - route handlers `app/api/**/route.ts`
  - server actions (`"use server"`)
- Client-only code lives in:
  - `**/*.client.tsx` (or `/client/*`)
- **Never import server-only modules into client components.** Enforce via lint boundaries and/or `server-only` / `client-only`.

---

## 3) Data Fetching & Caching (Explicit Always)

### 3.1 Fetch on the server
- Pages/layouts load data in Server Components.
- Client fetching is only for:
  - live polling / subscriptions (rare)
  - highly interactive screens where SSR provides no value

### 3.2 Caching is never accidental
Every `fetch()` must declare strategy:
- **User-specific / authenticated**: `cache: "no-store"` (default assumption)
- **Public / safe to cache**: `next: { revalidate: N }`
- **Tag-based caching**: use tags, revalidate on mutation.

### 3.3 Mutations must revalidate
- Any data-changing operation must call:
  - `revalidateTag()` and/or `revalidatePath()`
- Don’t rely on “eventual consistency” unless you explicitly designed for it.

### 3.4 Avoid waterfalls
- Prefer parallel fetching (`Promise.all`) in server code where it reduces latency.
- Don’t overfetch: keep queries scoped to the page/feature needs.

---

## 4) Mutations: Server Actions & Route Handlers Only

### 4.1 All mutations are server-side
- Use **server actions** or **route handlers** only.
- No direct DB calls from client. No secret keys in client. No “temporary” bypass.

### 4.2 Every mutation must be
- **Validated** (Zod schema at boundary)
- **Authorized** (explicit check)
- **Idempotent** where possible (idempotency key / upsert / unique constraints)
- **Auditable** (structured log + correlation id)
- **Consistent** (returns a typed success + typed error shape)

### 4.3 Typed error shape (recommended)
- Standardize mutation failures as:
  - `{ code, message, fieldErrors? }`
- UI must not depend on parsing arbitrary thrown strings.

---

## 5) Routing, Params, and URL Discipline

### 5.1 Route tree is not a domain tree
- `app/` is routing + composition only.
- Domain logic belongs in `features/`.

### 5.2 `params` and `searchParams` are not trusted
- Parse/validate them per page:
  - `parseParams(params)`
  - `parseSearchParams(searchParams)`
- Don’t sprinkle `Number(searchParams.page)` across components.

### 5.3 Route handlers are your public API surface
- `app/api/**/route.ts` must:
  - validate inputs
  - authorize
  - return a consistent JSON envelope / error format
  - never leak internal stack traces
  - rate-limit sensitive routes where appropriate

---

## 6) Types & Validation (TypeScript Strict Culture)

### 6.1 TS settings
- `strict: true` is mandatory.
- Strongly recommended:
  - `noUncheckedIndexedAccess: true`
  - `exactOptionalPropertyTypes: true` (if your codebase can handle it)

### 6.2 No escape hatches by default
- **No `any`.** Tests may allow isolated escape hatches if justified.
- Avoid casual `as` casting:
  - If you must cast, cast the **narrowest** type and add a comment explaining why it is safe.

### 6.3 Runtime validation at boundaries
- Validate:
  - env vars
  - request bodies
  - route params / query strings
  - external API responses
- Never trust client input types even if TypeScript “looks fine”.

### 6.4 DTOs are not ORM models
- Shared types are contracts/DTOs, not DB entities.
- Don’t leak Prisma/ORM types to the client.

---

## 7) Error Handling & Segment UX (Required)

### 7.1 Route segments must include boundaries
For every route segment that matters:
- `loading.tsx` (real skeleton, not spinner-only)
- `error.tsx` (recoverable UI)
- `not-found.tsx` when applicable

### 7.2 Use server routing helpers
- Prefer `redirect()` and `notFound()` on the server over client hacks.

### 7.3 Don’t swallow errors
- Client shows user-safe messages.
- Server logs the real error (with correlation id).

---

## 8) Security Defaults (No Exceptions)

### 8.1 Auth is server-only
- Authorization checks happen in:
  - Server Components (when deciding what to render)
  - route handlers
  - server actions
- Never rely on client-only guards.

### 8.2 Cookies and sessions are explicit
- Configure cookies with explicit:
  - `httpOnly`, `secure`, `sameSite`
- Avoid storing secrets or session tokens in client-accessible storage.

### 8.3 Output encoding mindset
- Never render untrusted HTML.
- Sanitize/escape any user-provided content that could be interpreted as HTML.

### 8.4 Rate-limit sensitive endpoints
- Login, OTP, password reset, payment-like operations, webhooks, etc.

### 8.5 Central headers
- CSP and security headers should be configured centrally (not per-page ad hoc).

---

## 9) UI & Design System Rules

### 9.1 Component placement
- Base reusable components: `shared/ui`
- Domain components: `features/<domain>/ui`

### 9.2 One source of truth for design tokens
- Use Tailwind config + CSS variables (or your chosen single system).
- No random inline styling unless truly one-off.

### 9.3 Accessibility is required
- Labels, focus states, keyboard nav, and appropriate ARIA where needed.
- No “it looks fine” without keyboard testing for interactive elements.

---

## 10) State Management Rules

### 10.1 Server state ≠ client state
- Prefer server render + revalidation over global stores.

### 10.2 Choose one client cache strategy
- If you need client caching, use **one** library consistently (SWR or TanStack Query).
- Avoid mixed patterns across features.

### 10.3 Global stores are the exception
- Only use a global store when multiple distant components truly share interactive state.
- Document why it must be global.

---

## 11) Observability (Production Reality)

### 11.1 Structured logs only
- No `console.log` in app code (except temporary local debug not committed).

### 11.2 Correlation id
- Carry a correlation id through request lifecycle:
  - edge → app → API → DB logs

### 11.3 Track business events
- Emit/record key business events (signup completed, payment initiated/succeeded/failed, etc.).
- Scrub PII where required.

### 11.4 Error reporting
- Use a centralized error tracker (e.g., Sentry-like) for server + client, with PII rules.

---

## 12) Testing Rules

### 12.1 What to test
- **Unit tests**: pure logic and validators.
- **Integration tests**: route handlers / server actions (happy path + auth + validation).
- **E2E tests**: critical flows only (signup, checkout/payment, settings).

### 12.2 What to avoid
- Snapshot spam. Prefer assertions that match business behavior.

---

## 13) Performance Guardrails

- Don’t import heavy libs into client components.
- Use `next/image` for images and `next/font` for fonts.
- Avoid waterfalls: fetch server-side when possible; avoid “fetch on mount” for initial page render.

---

## 14) Code Quality Enforcement (CI-Blocking)

- ESLint + Prettier + TypeScript checks are **blocking**.
- Enforce import boundaries (server/client + feature/shared/lib direction).
- Unused exports and dead code should fail CI (or be aggressively enforced).
- No TODOs without owner + date (or ticket reference).

---

## Appendix: Recommended Folder Layout

- `app/` — routes, layouts, segment boundaries (`loading.tsx`, `error.tsx`, `not-found.tsx`)
- `features/<domain>/`
  - `ui/`
  - `actions.ts` (server actions)
  - `queries.ts` (server-side query functions)
  - `schemas.ts` (zod)
- `shared/` — shared UI + small shared helpers
- `lib/` — infra (db, auth, logging, config)
