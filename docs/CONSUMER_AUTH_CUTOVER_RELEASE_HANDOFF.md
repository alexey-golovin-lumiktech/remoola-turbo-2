# Consumer Auth Cutover Release Handoff

Updated: 2026-04-06

This document is a release-specific handoff and closure artifact for the consumer auth cutover. Treat it as historical operational evidence plus rollout notes, not as the primary evergreen description of the current contract. For the maintained contract view, use `docs/CONSUMER_AUTH_COOKIE_POLICY.md`, `docs/API_V2_PRODUCTION_RELEASE_GATE.md`, `docs/PROJECT_SUMMARY.md`, and `docs/PROJECT_DOCUMENTATION.md`.

## Scope

This handoff covers the final Step 5 closure for the canonical consumer auth cutover in:

- `apps/api-v2`
- `apps/api` (kept aligned as mirrored authority for the same contract)
- consumer FE/BFF auth-adjacent surfaces still participating in the current contract
- release/readiness docs and evidence

Additional follow-up hardening in the broader consumer stack now requires
explicit canonical consumer app origin envs in `apps/consumer`,
`apps/consumer-mobile`, and `apps/consumer-css-grid`, and keeps the mirrored
`apps/api` trust-layer semantics aligned with `apps/api-v2`.

## Code-Proven Now

- Active consumer auth public surface in:
  - `apps/api-v2`
  - `apps/consumer`
  - `apps/consumer-mobile`
  - `apps/consumer-css-grid`
  contains no `returnOrigin`.
- Forgot-password verify is token-only and does not depend on query `referer`.
- Signup verification is token-only and does not depend on query `referer`.
- Forgot-password request now requires explicit claimed `appScope`, and the backend
  requires exact match between the claim and `x-remoola-app-scope`.
- Public browser/email initiated auth routes intentionally stay query-scoped or
  token-scoped and do not require `x-remoola-app-scope`:
  - `GET /api/consumer/auth/google/start`
  - `GET /api/consumer/auth/google/callback`
  - `GET /api/consumer/auth/forgot-password/verify`
  - `GET /api/consumer/auth/signup/verification`
- Protected consumer auth and BFF-driven mutation/read flows still require exact
  claimed/request header scope alignment.
- Token-only verify flows no longer redirect to any default consumer app:
  - forgot-password verify requires stored valid `appScope`
  - signup verification requires decoded/stored valid `appScope`
- Consumer access tokens without explicit `scope` are rejected.
- Unsigned legacy consumer device cookies are ignored; the middleware rotates to a
  new signed scoped cookie instead of accepting the old value.
- Ancillary redirect-capable flows route through canonical `appScope -> origin` mapping:
  - Stripe checkout session creation
  - payment-request send flow
  - payer-facing payment-request email links
- Request-derived `Origin` remains only in the browser transport layer:
  - CORS allowlisting
- Consumer CSRF validation is scope-based and uses:
  - `x-remoola-app-scope`
  - scoped CSRF cookie/header pair
  - matching stored/session `appScope`
  - per-app request-scope / cookie-namespace selection
- Consumer BFF/proxy layers no longer rely on Vercel deployment metadata as a
  production fallback origin. Production origin resolution is strict fail-fast:
  every consumer app must provide its canonical origin via explicit app env.
- Google OAuth callback now reads the stored `state` record first, derives the
  cookie namespace from the stored `appScope`, and avoids prematurely consuming
  a valid `state` record when unrelated cookies from another consumer app are present.
- Browser-supplied request `Origin` / `Referer` can still influence trust-layer
  validation, which means preview / branch deployment hostnames are not part of
  the supported auth or CSRF contract for this cutover.
- Release is blocked if migration `20260406130000_auth_sessions_app_scope` is
  not applied or if `auth_sessions.app_scope` is missing / nullable in the target DB.
- Historical payment-link provenance is now frozen in data, not inferred at runtime:
  `ledger_entry.metadata.consumerAppScope` backfill completed for the existing
  payment-request-linked backlog (`18` rows across `13` payment requests, `0`
  remaining rows without valid scope at execution time).
- Ambiguous trust-layer helper names were removed from active `api-v2` code:
  - `validateConsumerRedirectOrigin()` -> `validateTrustedConsumerOrigin()`
  - `resolveRequestOriginForPath()` -> `resolveTrustedRequestOriginForPath()`

## Release Model

This cutover is approved only as a coordinated one-window deployment across:

- `apps/api-v2`
- `apps/consumer`
- `apps/consumer-mobile`
- `apps/consumer-css-grid`

Release rules:

- no backend-first rollout
- no frontend-first rollout
- no partial app rollout
- no mixed-version skew between backend and any consumer app
- rollback must also be coordinated across backend and all three consumer apps

Operational meaning:

- ancillary routes that now require explicit `appScope` are treated as a hard
  synchronized contract change, not a rolling backward-compatible migration
- release evidence is valid only on canonical production domains backed by the
  configured `CONSUMER_*_APP_ORIGIN` envs
- preview / branch deploy auth results must not be used as go/no-go release evidence

## Chat-Proven Now

- Step 2, Step 3, and Step 4 prerequisites remain satisfied for this bounded cutover.
- Hard-cutover assumptions remain anchored to `ai_docs/canonical-auth-cutover/00-execution-note.md`, and no drift was found in active Step 5 scope.
- Current contract docs already describe the canonical state:
  - `docs/PROJECT_DOCUMENTATION.md`
  - `docs/FEATURES_CURRENT.md`
  - `docs/PROJECT_SUMMARY.md`
  - `docs/API_V2_PRODUCTION_RELEASE_GATE.md`
  - `docs/CONSUMER_AUTH_COOKIE_POLICY.md`
- `CHANGELOG.md` references to old `returnOrigin` / `referer` contracts are historical record only, not current contract docs.

## Remaining Hit Classification

### Legitimate trust / CORS / CSRF / request-validation usage to keep

- `apps/api-v2/src/main.ts`
- `apps/api-v2/src/shared-common/csrf-protection.ts`
- `apps/api-v2/src/auth/jwt.strategy.ts`
- `apps/api-v2/src/guards/auth.guard.ts`
- `apps/api-v2/src/common/middleware/device-id.middleware.ts`
- `apps/api-v2/src/consumer/auth/auth.controller.ts`
- `apps/api-v2/src/consumer/modules/payment-methods/stripe.controller.ts`
- `apps/api-v2/src/consumer/modules/payments/consumer-payment-requests.controller.ts`

These use request `Origin` / `Referer` only to validate the caller or select the correct consumer scope. None of them use request-derived origin as final redirect identity.

### Regression guard tests to keep

- `apps/api-v2/src/shared/origin-resolver.service.spec.ts`
- `apps/api-v2/src/shared/mailing.service.spec.ts`
- `apps/api-v2/src/common/middleware/device-id.middleware.spec.ts`
- `apps/api-v2/src/guards/auth.guard.spec.ts`
- `apps/api-v2/src/consumer/auth/auth.service.request-password-reset.spec.ts`
- `apps/api-v2/src/consumer/auth/auth.controller.spec.ts`
- `apps/api-v2/src/consumer/auth/oauth-state-store.service.spec.ts`
- `apps/api-v2/src/consumer/auth/auth.service.forgot-password-verify.spec.ts`
- `apps/api-v2/src/consumer/auth/auth.service.signup-verification.spec.ts`
- `apps/api-v2/test/forgot-reset-password.e2e-spec.ts`
- `apps/api-v2/test/signup-verification.e2e-spec.ts`
- `apps/consumer/src/app/(auth)/signup/verification/Verification.test.tsx`
- `apps/consumer/src/app/forgot-password/confirm/page.test.tsx`
- `apps/consumer-mobile/src/features/signup/VerificationView.test.tsx`
- `apps/consumer-mobile/src/features/auth/ui/ResetPasswordConfirmForm.test.tsx`
- `apps/consumer-css-grid/src/app/(auth)/signup/verification/page.test.tsx`
- `apps/consumer-css-grid/src/app/(auth)/forgot-password/confirm/page.test.tsx`

These remain intentionally because they prove the old query-only `referer`
contract is no longer required, public query/token-scoped browser routes still
work without a custom header, and cross-app OAuth state cookies fail safely.

### Historical docs / changelog mentions not blocking release

- `CHANGELOG.md`

### Non-auth usage explicitly out of scope

- invoice-template `referer` fields used as business recipient data, not auth routing

### Unsupported for this cutover

- Vercel preview / branch deployment auth smoke for consumer apps
- preview CSRF validation smoke
- preview OAuth start / callback validation as release evidence
- preview ancillary payment-request send / checkout-session smoke when trust-layer
  origin validation depends on preview hostnames
- mixed-version rollout where backend requires the new ancillary `appScope`
  contract but one or more consumer apps still run older BFF behavior

## Targeted Test Sweep

### Backend unit/spec sweep

```bash
yarn workspace @remoola/api-v2 test --runInBand \
  src/common/middleware/device-id.middleware.spec.ts \
  src/guards/auth.guard.spec.ts \
  src/consumer/auth/oauth-state-store.service.spec.ts \
  src/consumer/auth/auth.service.request-password-reset.spec.ts \
  src/shared/origin-resolver.service.spec.ts \
  src/shared/mailing.service.spec.ts \
  src/consumer/modules/payment-methods/stripe.controller.spec.ts \
  src/consumer/modules/payments/consumer-payment-requests.controller.spec.ts \
  src/consumer/auth/auth.controller.spec.ts \
  src/consumer/auth/auth.service.signup-verification.spec.ts \
  src/consumer/auth/auth.service.forgot-password-verify.spec.ts
```

Result:

- `11` suites passed
- targeted hard-cutover regressions green

### Backend auth e2e sweep

```bash
yarn workspace @remoola/api-v2 test:e2e:fast --runInBand \
  test/forgot-reset-password.e2e-spec.ts \
  test/signup-verification.e2e-spec.ts
```

Result:

- `2` suites passed
- `15` tests passed

### Consumer FE/BFF sweep

```bash
yarn workspace @remoola/consumer test --runInBand --runTestsByPath \
  "src/app/api/payment-requests/[paymentRequestId]/send/route.test.ts" \
  "src/app/api/stripe/[paymentRequestId]/stripe-session/route.test.ts" \
  "src/app/(auth)/signup/verification/Verification.test.tsx" \
  "src/app/forgot-password/confirm/page.test.tsx"
```

Result:

- `4` suites passed
- `7` tests passed

### Consumer-mobile FE/BFF sweep

```bash
yarn workspace @remoola/consumer-mobile test --runInBand --runTestsByPath \
  "src/app/api/payment-requests/[paymentRequestId]/send/route.test.ts" \
  "src/app/api/stripe/[paymentRequestId]/stripe-session/route.test.ts" \
  "src/features/signup/VerificationView.test.tsx" \
  "src/features/auth/ui/ResetPasswordConfirmForm.test.tsx"
```

Result:

- `4` suites passed
- `7` tests passed

### Consumer css-grid FE/BFF sweep

```bash
yarn workspace @remoola/consumer-css-grid test --runInBand --runTestsByPath \
  "src/lib/consumer-mutations.server.test.ts" \
  "src/app/(auth)/signup/verification/page.test.tsx" \
  "src/app/(auth)/forgot-password/confirm/page.test.tsx"
```

Result:

- `3` suites passed
- `17` tests passed

## Post-Deploy Only

The following cannot be honestly proven in chat and must remain release-owner smoke checks:

- synchronized backend and FE/BFF deployment timing
- confirmation that no external clients still depend on removed legacy contracts
- live Google OAuth login/signup smoke in all consumer apps on canonical production domains only
- live forgot-password request + verify + reset smoke in all consumer apps on canonical production domains only
- live signup verification email + redirect smoke in all consumer apps on canonical production domains only
- production cookie scope, session invalidation, refresh, logout, and logout-all behavior on canonical production domains only
- production monitoring / rollback readiness during the cutover window

Minimum smoke checklist:

- consumer web Google login + signup on canonical domain
- consumer mobile Google login + signup on canonical domain
- consumer css-grid Google login + signup on canonical domain
- forgot-password request + verify redirect + confirm page in each app on canonical domain
- signup verification email link + redirect in each app on canonical domain
- refresh / logout / logout-all after cutover on canonical domains
- do not use preview / branch deployment URLs as release smoke evidence

## Release Artifacts Present

- `docs/API_V2_PRODUCTION_RELEASE_GATE.md`
- `docs/CONSUMER_AUTH_COOKIE_POLICY.md`
- `docs/CONSUMER_AUTH_CUTOVER_RELEASE_HANDOFF.md`

Local scratch evidence also exists in ignored handoff notes, but the tracked source of truth is this file plus the two docs above.

## Legacy Paths Definitively Removed

- consumer OAuth public `returnOrigin`
- forgot-password verify query `referer`
- signup verification query `referer`
- request-derived final redirect identity on ancillary consumer send / checkout flows
- ambiguous trust-layer helper names that still looked like redirect-routing API
- unsigned consumer device-cookie fallback
- access-token acceptance without explicit `scope`
- default consumer-origin fallback for forgot-password / signup verification token-only redirects
