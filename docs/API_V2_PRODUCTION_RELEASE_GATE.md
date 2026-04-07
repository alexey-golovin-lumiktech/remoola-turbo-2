# API v2 Production Release Gate

This checklist is required evidence for auth-sensitive `api-v2` releases.

## Scope

Use this gate when the release touches:

- consumer or admin auth/session logic
- BFF auth proxies
- cookie behavior
- OAuth state handling
- Stripe or money-moving surfaces that depend on authenticated consumer identity

## Required config evidence

Capture the effective production values for these controls without exposing secret contents:

- `JWT_ACCESS_SECRET` is set to a real non-empty secret and is not the placeholder default.
- `JWT_REFRESH_SECRET` is set to a real non-empty secret and is not the placeholder default.
- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are distinct values.
- `SECURE_SESSION_SECRET` is set to a real non-empty secret and is not the placeholder default.
- `STRIPE_SECRET_KEY` is set to a real non-empty secret and is not the placeholder default.
- `STRIPE_WEBHOOK_SECRET` is set to a real non-empty secret and is not the placeholder default.
- `COOKIE_SECURE=true`.
- `ALLOW_PRODUCTION_BOOTSTRAP_SEED=false`.
- `SWAGGER_ENABLED=false` unless there is explicit internal-only exposure approval.
- `PUBLIC_DETAILED_HEALTH_ENABLED=false`.
- `PUBLIC_MAIL_TRANSPORT_HEALTH_ENABLED=false`.
- `HEALTH_TEST_EMAIL_ENABLED=false`.
- `NGROK_ENABLED=false` and `NGROK_AUTH_TOKEN` / `NGROK_DOMAIN` are not blank and not set to enable public ingress in production unless there is explicit operational approval.
- Frontend example envs and deploy-time config for the cutover set explicitly declare `CONSUMER_APP_ORIGIN`, `CONSUMER_MOBILE_APP_ORIGIN`, and `CONSUMER_CSS_GRID_APP_ORIGIN` as the canonical production app origins.
- `NEXT_PUBLIC_APP_ORIGIN` is treated only as legacy compatibility fallback, not as release evidence or the primary production contract.

Source of truth:

- `apps/api-v2/src/envs.ts`
- `apps/api-v2/src/main.ts`
- `apps/api-v2/src/auth/jwt.strategy.ts`
- `apps/api-v2/src/health/health.service.ts`

## Runtime evidence

Collect proof from the target environment:

All runtime evidence for this cutover must be collected on canonical production
consumer domains backed by:

- `CONSUMER_APP_ORIGIN`
- `CONSUMER_MOBILE_APP_ORIGIN`
- `CONSUMER_CSS_GRID_APP_ORIGIN`

For boundary clarity: `consumer-css-grid` evidence belongs to the `apps/api-v2`
release surface. Legacy `apps/api` is not the backend authority for
`CONSUMER_CSS_GRID_APP_ORIGIN`.

Do not use Vercel preview / branch deployment hostnames as release evidence for
consumer auth, CSRF, OAuth, or ancillary app-scope routing.

1. Fresh consumer login succeeds only through frontend BFF routes and sets auth cookies correctly on canonical app domains.
2. Consumer refresh succeeds with valid `Origin`/`Referer` plus CSRF enforcement intact on canonical app domains.
3. Consumer logout and logout-all clear auth cookies correctly through the frontend BFF on canonical app domains.
4. OAuth callback rejects invalid or missing state outside local debug environments on canonical app domains.
5. A fresh consumer session row contains `access_token_hash` after login or refresh.
6. Consumer API requests succeed with a fresh access token, fail after session revocation, and reject access tokens that are missing the explicit `scope` claim.
7. Historical `ledger_entry` rows used by payment-link flows have `metadata.consumerAppScope` populated with no remaining null/invalid backlog before the hard cutover is declared complete.
8. `/docs/*` is disabled or restricted as intended in the target environment.
9. `/health/detailed`, `/health/mail-transport`, and `POST /health/test-email` are disabled or restricted as intended in the target environment.
10. Stripe webhook retry after a transient handler failure does not silently drop processing.

## Cutover sequencing

This release is a synchronized cutover, not a rolling migration.

Required deployment choreography:

1. Freeze the release set: `apps/api-v2`, `apps/consumer`, `apps/consumer-mobile`, `apps/consumer-css-grid`.
2. Deploy the frozen backend and all three consumer apps in one coordinated release window.
3. Run auth, CSRF, OAuth, and ancillary smoke checks only on canonical production domains backed by the configured consumer app origin envs.
4. If any auth/cookie/csrf/app-scope smoke fails, perform a coordinated rollback across backend and all three consumer apps.

Explicitly unsupported for go/no-go evidence:

- backend-first rollout with later consumer app deployment
- frontend-first rollout with later backend deployment
- partial rollout of only one or two consumer apps
- preview / branch deployment smoke as a substitute for canonical production smoke
- mixed-version skew where backend requires the new ancillary `appScope` contract but any consumer app still runs the old BFF behavior

Route contract note for this cutover:

- public browser/email initiated consumer auth routes intentionally remain query-scoped or token-scoped and must not depend on a custom `x-remoola-app-scope` header:
  - `GET /api/consumer/auth/google/start`
  - `GET /api/consumer/auth/google/callback`
  - `GET /api/consumer/auth/forgot-password/verify`
  - `GET /api/consumer/auth/signup/verification`
- protected BFF-driven auth and mutation/read flows remain strict header-scoped and still require exact `x-remoola-app-scope` alignment with the claimed/requested app scope

## Schema evidence

Run in the target database after migration:

```sql
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = current_schema()
  AND table_name = 'auth_sessions'
  AND column_name = 'access_token_hash';
```

Expected result:

- one row for `access_token_hash`
- `data_type = text`
- `is_nullable = YES`

Also verify the cutover session scope column introduced by `20260406130000_auth_sessions_app_scope`:

```sql
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = current_schema()
  AND table_name = 'auth_sessions'
  AND column_name = 'app_scope';
```

Expected result:

- one row for `app_scope`
- `data_type = text`
- `is_nullable = NO`

Hard-cutover payment-link backfill evidence:

```sql
SELECT COUNT(*)::int AS remaining_rows
FROM ledger_entry
WHERE payment_request_id IS NOT NULL
  AND deleted_at IS NULL
  AND (
    metadata IS NULL
    OR jsonb_typeof(metadata::jsonb) <> 'object'
    OR NOT (metadata::jsonb ? 'consumerAppScope')
    OR COALESCE(metadata::jsonb ->> 'consumerAppScope', '') NOT IN ('consumer', 'consumer-mobile', 'consumer-css-grid')
  );
```

Expected result:

- `remaining_rows = 0`

## Verification commands

Capture outputs from CI or staging:

1. `yarn workspace @remoola/api-v2 test --runInBand src/guards/auth.guard.spec.ts src/auth/jwt.strategy.spec.ts src/common/middleware/device-id.middleware.spec.ts src/consumer/auth/auth.controller.spec.ts src/consumer/auth/oauth-state-store.service.spec.ts src/consumer/auth/auth.service.request-password-reset.spec.ts src/consumer/auth/auth.service.forgot-password-verify.spec.ts src/consumer/auth/auth.service.signup-verification.spec.ts src/shared/mailing.service.spec.ts`
2. `yarn workspace @remoola/api-v2 test --runInBand src/consumer/auth/auth.service.issue-tokens.spec.ts src/envs.spec.ts src/health/health.service.spec.ts`
3. `yarn workspace @remoola/api-v2 test --runInBand src/consumer/modules/payment-methods/stripe-webhook.service.spec.ts src/consumer/modules/payments/consumer-payments.concurrency.spec.ts src/consumer/modules/exchange/consumer-exchange.concurrency.spec.ts`
4. `yarn workspace @remoola/consumer-css-grid test --runInBand src/app/api/me/route.test.ts src/app/api/documents/upload/route.test.ts src/app/api/consumer/auth/clear-cookies/route.test.ts src/lib/consumer-api.server.test.ts src/lib/consumer-mutations.server.test.ts`
5. `yarn workspace @remoola/api-v2 lint`
6. `yarn workspace @remoola/consumer-css-grid lint`

## Stop conditions

Do not release if any of the following are true:

- placeholder defaults or blank critical values are still effective in production
- `COOKIE_SECURE` is not enabled in production
- bootstrap seeding is allowed in production
- OAuth state fallback is enabled outside dev/test
- Swagger or sensitive health endpoints are publicly exposed contrary to the release intent
- ngrok public ingress is enabled in production-like environments
- state-changing auth requests without valid `Origin` or `Referer` are accepted unexpectedly in production-like environments
- `access_token_hash` migration is not applied
- migration `20260406130000_auth_sessions_app_scope` is not applied
- `auth_sessions.app_scope` is missing, nullable, or not `text`
- any payment-link `ledger_entry` still lacks valid `metadata.consumerAppScope`
- unsigned legacy device cookies are still accepted as identity continuity
- consumer access tokens without an explicit `scope` claim are still accepted
- Stripe webhook replay after a transient failure can still poison retries and silently skip handler work
- consumer auth works only for legacy sessions and fails for fresh sessions
- targeted auth/BFF verification is missing or red
- any planned or actual deployment skew exists between `apps/api-v2` and one or more consumer apps in the cutover set
- release smoke was executed primarily on preview / branch deployment URLs instead of canonical configured production domains
- no coordinated deployment window / rollback window was defined for the backend plus all three consumer apps
