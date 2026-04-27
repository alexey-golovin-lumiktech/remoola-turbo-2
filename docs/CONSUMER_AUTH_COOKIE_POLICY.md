# Consumer Auth Cookie Policy

## Source Of Truth

- Browser-facing consumer session cookies must be created and refreshed only by the same-origin BFF of the app that owns the session:
  - `apps/consumer-css-grid`
- `apps/api-v2` is the backend authority for `apps/consumer-css-grid`.
- `CONSUMER_CSS_GRID_APP_ORIGIN` is the canonical consumer browser origin.
- Consumer-facing browser auth in this repo is cookie-first. `Authorization: Bearer` is not part of the supported browser/BFF auth contract.

## Dedicated Namespace

- The maintained consumer runtime uses a single canonical cookie namespace.
- Secure production keys:
  - `consumer-css-grid`: `__Host-consumer_css_grid_*`
  - `admin`: `__Host-admin_*`
- Local HTTP fallbacks use the same canonical consumer namespace without the `__Host-` prefix.
- Legacy `consumer` / `consumer-mobile` scope values are normalized only as bounded compatibility input and no longer represent independent runtime surfaces.

## Local Development Policy

- Supported local matrices:
  - `consumer-css-grid` on `http://localhost:3003` with `api-v2` external origin and frontend URLs also on `localhost`
  - `consumer-css-grid` on `http://127.0.0.1:3003` with `api-v2` external origin and frontend URLs also on `127.0.0.1`
- Mixed-host flows such as `localhost` frontend with `127.0.0.1` API are unsupported because browsers keep separate cookie jars for those hosts.
- If both hosts are used in development, keep Google OAuth redirect URIs registered for both exact callback URLs and switch envs together.

## Vercel Production Policy

- Production with different Vercel domains for frontend and API must rely on frontend same-origin BFF routes for login, refresh, `me`, and OAuth completion.
- Browser-facing BFF routes must forward consumer identity via `cookie`; do not widen the trust boundary by forwarding client-supplied `Authorization` headers upstream.
- Browser-facing BFF routes must also send a trusted frontend `Origin` on upstream auth-protected reads and mutations so the backend can resolve the correct per-app cookie scope.
- Canonical production auth origins are only the configured app origins behind:
  - `CONSUMER_CSS_GRID_APP_ORIGIN`
- These app-specific envs are the production source of truth for same-origin BFF/auth flows.
- `NEXT_PUBLIC_APP_ORIGIN` is legacy compatibility fallback only and must not be treated as the primary release contract.
- Vercel preview / branch deployment hostnames are not part of the supported consumer auth or CSRF contract for this cutover.
- Release-owner smoke for auth, refresh, logout, logout-all, OAuth, and ancillary app-scope routing must run only on canonical production app origins, not on preview URLs.
- `NEST_APP_EXTERNAL_ORIGIN` is the exact Google callback origin source of truth for `api-v2`.
- `COOKIE_SECURE` must be enabled for real HTTPS production traffic; do not depend on insecure shared cookies between different Vercel apps.
- This cutover is not rolling-migration tolerant: ancillary routes that now require explicit `appScope` must be deployed as a synchronized backend + consumer-app release with no skew.

## Checklist

- Use relative frontend routes such as `/api/login`, `/api/me`, `/api/consumer/auth/refresh`, `/api/oauth/complete`, and `/api/consumer/auth/google/start` from browser-facing auth flows.
- Keep `/api/me`, document-upload, and other BFF routes cookie-first and drop incoming `Authorization` headers before proxying upstream.
- Browser-facing auth mutations must send both a valid frontend `Origin`/`Referer` and matching `x-csrf-token` + CSRF cookie.
- Browser-facing auth reads that rely on cookie session lookup must preserve a trusted app `Origin`, not just the cookie header.
- In production release smoke, the trusted app `Origin` must match the configured canonical app origin for that app, not a preview hostname.
- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` must be distinct; refresh tokens are signed and verified only with `JWT_REFRESH_SECRET`.
- Keep Google OAuth redirect URIs explicit and exact. No wildcard and no implicit host switching.
- When changing local hostnames, update `NEXT_PUBLIC_API_BASE_URL`, `NEST_APP_EXTERNAL_ORIGIN`, frontend origin settings, and OAuth console configuration together.
- Do not treat preview / branch deployment auth behavior as a supported verification surface for this release.
- Do not perform backend-first, frontend-first, or otherwise skewed rollout for the ancillary `appScope` contract change.
