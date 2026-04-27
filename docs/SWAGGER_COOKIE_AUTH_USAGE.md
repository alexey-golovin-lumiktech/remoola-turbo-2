# Swagger Cookie-Auth Usage

## Overview

The Swagger pages served by `apps/api-v2` are cookie-first.

- Do not use `Authorization` headers for manual Swagger testing.
- Do not use Swagger's old Basic auth mental model.
- Authenticate by calling the real login endpoints from the docs UI.

Swagger works best when opened on the same API origin that serves the docs page and the cookies.

## Admin Swagger Flow

Use this flow on `/docs/admin`:

1. Open the Swagger page from the API origin you want to test.
2. Run `POST /api/admin/auth/login` with the JSON body credentials.
3. Let the browser store the returned auth cookies on that API origin.
4. Use `Try it out` on protected admin endpoints from the same page.

Expected behavior:

- the browser reuses the admin session cookies automatically
- the Swagger page auto-sends `x-csrf-token` for same-origin `POST /api/admin/auth/refresh-access`
- no manual `Authorization` header is required
- `POST /api/admin/auth/logout` clears the session cookies

## Consumer Swagger Flow

Use this flow on `/docs/consumer`:

1. Open the Swagger page from the API origin you want to test.
2. Run `POST /api/consumer/auth/login` with the JSON body credentials.
3. Let the browser store the returned access, refresh, and CSRF cookies on that API origin.
4. Use `Try it out` on protected consumer endpoints from the same page.

Expected behavior:

- the browser reuses the consumer session cookies automatically
- no manual `Authorization` header is required
- the Swagger page auto-sends `x-csrf-token` for same-origin consumer auth mutation routes that require CSRF parity
- these API-origin Swagger cookies are separate from the frontend BFF cookie namespace used by `consumer-css-grid`

## Consumer Routes With CSRF Requirements

For same-origin Swagger usage, the docs page should mirror the readable CSRF cookie into `x-csrf-token` for routes such as:

- `POST /api/consumer/auth/refresh`
- `POST /api/consumer/auth/logout`
- `POST /api/consumer/auth/logout-all`
- `POST /api/admin/auth/refresh-access`

If one of these routes returns `Invalid CSRF token`, first log in again from the same Swagger page and retry from the same API origin.

## Troubleshooting

If protected calls still look unauthenticated:

- confirm you logged in from the same Swagger page and API origin
- confirm the login response returned `Set-Cookie`
- confirm the browser stored those cookies for the API origin
- avoid mixing `localhost` and `127.0.0.1`, because they use different cookie jars
- avoid cross-origin Swagger usage if you want the smoothest cookie behavior

## Important Boundaries

- Swagger manual testing on the API origin is separate from the frontend BFF cookie model used by browser apps.
- Frontend apps now use per-app cookie namespaces; Swagger does not merge or reuse those frontend-domain cookies across apps.
- This setup improves developer ergonomics for same-origin API debugging; it does not restore Bearer or Basic auth as a supported runtime contract.
