# Consumer Auth Cookie Policy

## Source Of Truth

- Browser-facing consumer session cookies must be created and refreshed only by `apps/consumer-css-grid` same-origin BFF routes under `src/app/api`.
- `apps/api-v2` remains the backend authority for auth decisions, but the browser should not rely on `api-v2` domain cookies for the main consumer session.

## Cookie Split

- Frontend-domain cookies:
  - consumer access token
  - consumer refresh token
  - consumer device id
  - csrf token used by frontend-owned auth routes
- API-domain cookies:
  - temporary Google OAuth state cookie needed for the top-level redirect to Google and the callback roundtrip back to `api-v2`

## Dedicated Namespace

- `apps/api-v2` and `apps/consumer-css-grid` use a dedicated `consumer_v2_*` cookie namespace so they do not share browser session identity with the legacy consumer apps.
- Older consumer apps keep the existing shared consumer cookie keys unless they are explicitly migrated.

## Local Development Policy

- Supported local matrices:
  - `consumer-css-grid` on `http://localhost:3003` with `api-v2` external origin and frontend URLs also on `localhost`
  - `consumer-css-grid` on `http://127.0.0.1:3003` with `api-v2` external origin and frontend URLs also on `127.0.0.1`
- Mixed-host flows such as `localhost` frontend with `127.0.0.1` API are unsupported because browsers keep separate cookie jars for those hosts.
- If both hosts are used in development, keep Google OAuth redirect URIs registered for both exact callback URLs and switch envs together.

## Vercel Production Policy

- Production with different Vercel domains for frontend and API must rely on frontend same-origin BFF routes for login, refresh, `me`, and OAuth exchange.
- Browser-facing BFF routes must forward consumer identity via `cookie`; do not widen the trust boundary by forwarding client-supplied `Authorization` headers to `api-v2`.
- `NEST_APP_EXTERNAL_ORIGIN` is the exact Google callback origin source of truth for `api-v2`.
- `COOKIE_SECURE` must be enabled for real HTTPS production traffic; do not depend on insecure shared cookies between different Vercel apps.

## Checklist

- Use relative frontend routes such as `/api/login`, `/api/me`, `/api/consumer/auth/refresh`, and `/api/oauth/exchange` from browser-facing auth flows.
- Keep `/api/me` and document-upload BFF routes cookie-first and strip incoming `Authorization` headers before proxying upstream.
- Keep Google OAuth redirect URIs explicit and exact. No wildcard and no implicit host switching.
- When changing local hostnames, update `NEXT_PUBLIC_API_BASE_URL`, `NEST_APP_EXTERNAL_ORIGIN`, frontend origin settings, and OAuth console configuration together.
