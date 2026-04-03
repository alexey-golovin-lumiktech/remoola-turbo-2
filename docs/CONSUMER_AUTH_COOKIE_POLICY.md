# Consumer Auth Cookie Policy

## Source Of Truth

- Browser-facing consumer session cookies must be created and refreshed only by the same-origin BFF of the app that owns the session:
  - `apps/consumer`
  - `apps/consumer-mobile`
  - `apps/consumer-css-grid`
- `apps/api` is the backend authority for `consumer` and `consumer-mobile`.
- `apps/api-v2` is the backend authority for `consumer-css-grid`.
- Consumer-facing browser auth in this repo is cookie-first. `Authorization: Bearer` is not part of the supported browser/BFF auth contract.

## Dedicated Namespace

- Every browser app now has its own runtime cookie namespace.
- Secure production keys:
  - `consumer`: `__Host-consumer_*`
  - `consumer-mobile`: `__Host-consumer_mobile_*`
  - `consumer-css-grid`: `__Host-consumer_css_grid_*`
  - `admin`: `__Host-admin_*`
- Local HTTP fallbacks follow the same split without the `__Host-` prefix.
- Hard rule: no consumer app may read, refresh, clear, or validate another consumer app's auth cookies as a fallback.

## Local Development Policy

- Supported local matrices:
  - `consumer` on `http://localhost:3001` or `http://127.0.0.1:3001`
  - `consumer-mobile` on `http://localhost:3002` or `http://127.0.0.1:3002`
  - `consumer-css-grid` on `http://localhost:3003` with `api-v2` external origin and frontend URLs also on `localhost`
  - `consumer-css-grid` on `http://127.0.0.1:3003` with `api-v2` external origin and frontend URLs also on `127.0.0.1`
- Mixed-host flows such as `localhost` frontend with `127.0.0.1` API are unsupported because browsers keep separate cookie jars for those hosts.
- If both hosts are used in development, keep Google OAuth redirect URIs registered for both exact callback URLs and switch envs together.

## Vercel Production Policy

- Production with different Vercel domains for frontend and API must rely on frontend same-origin BFF routes for login, refresh, `me`, and OAuth completion.
- Browser-facing BFF routes must forward consumer identity via `cookie`; do not widen the trust boundary by forwarding client-supplied `Authorization` headers upstream.
- Browser-facing BFF routes must also send their trusted frontend `Origin` on upstream auth-protected reads and mutations so the backend can resolve the correct per-app cookie scope.
- `NEST_APP_EXTERNAL_ORIGIN` is the exact Google callback origin source of truth for `api-v2`.
- `COOKIE_SECURE` must be enabled for real HTTPS production traffic; do not depend on insecure shared cookies between different Vercel apps.

## Checklist

- Use relative frontend routes such as `/api/login`, `/api/me`, `/api/consumer/auth/refresh`, `/api/oauth/complete`, and `/api/consumer/auth/google/start` from browser-facing auth flows.
- Keep `/api/me`, document-upload, and other BFF routes cookie-first and drop incoming `Authorization` headers before proxying upstream.
- Browser-facing auth mutations must send both a valid frontend `Origin`/`Referer` and matching `x-csrf-token` + CSRF cookie.
- Browser-facing auth reads that rely on cookie session lookup must preserve the app's trusted `Origin`, not just the cookie header.
- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` must be distinct; refresh tokens are signed and verified only with `JWT_REFRESH_SECRET`.
- Keep Google OAuth redirect URIs explicit and exact. No wildcard and no implicit host switching.
- When changing local hostnames, update `NEXT_PUBLIC_API_BASE_URL`, `NEST_APP_EXTERNAL_ORIGIN`, frontend origin settings, and OAuth console configuration together.
