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
- `CONSUMER_OAUTH_ALLOW_MISSING_STATE_COOKIE_FALLBACK=false`.
- `SWAGGER_ENABLED=false` unless there is explicit internal-only exposure approval.
- `PUBLIC_DETAILED_HEALTH_ENABLED=false`.
- `PUBLIC_MAIL_TRANSPORT_HEALTH_ENABLED=false`.
- `HEALTH_TEST_EMAIL_ENABLED=false`.
- `ALLOW_REQUESTS_WITHOUT_ORIGIN=false` unless the deployment explicitly requires non-browser callers.
- `NGROK_ENABLED=false` and `NGROK_AUTH_TOKEN` / `NGROK_DOMAIN` are not blank and not set to enable public ingress in production unless there is explicit operational approval.

Source of truth:

- `apps/api-v2/src/envs.ts`
- `apps/api-v2/src/main.ts`
- `apps/api-v2/src/auth/jwt.strategy.ts`
- `apps/api-v2/src/health/health.service.ts`

## Runtime evidence

Collect proof from the target environment:

1. Fresh consumer login succeeds only through frontend BFF routes and sets auth cookies correctly.
2. Consumer refresh succeeds with valid `Origin`/`Referer` plus CSRF enforcement intact.
3. Consumer logout and logout-all clear auth cookies correctly through the frontend BFF.
4. OAuth callback rejects invalid or missing state outside local debug environments.
5. A fresh consumer session row contains `access_token_hash` after login or refresh.
6. Consumer API requests succeed with a fresh access token and fail after session revocation.
7. `/docs/*` is disabled or restricted as intended in the target environment.
8. `/health/detailed`, `/health/mail-transport`, and `POST /health/test-email` are disabled or restricted as intended in the target environment.
9. Stripe webhook retry after a transient handler failure does not silently drop processing.

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

## Verification commands

Capture outputs from CI or staging:

1. `yarn workspace @remoola/api-v2 test --runInBand src/guards/auth.guard.spec.ts src/consumer/auth/auth.service.issue-tokens.spec.ts`
2. `yarn workspace @remoola/api-v2 test --runInBand src/envs.spec.ts src/auth/jwt.strategy.spec.ts src/health/health.service.spec.ts`
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
- Stripe webhook replay after a transient failure can still poison retries and silently skip handler work
- consumer auth works only for legacy sessions and fails for fresh sessions
- targeted auth/BFF verification is missing or red
