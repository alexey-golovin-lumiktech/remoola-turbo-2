# API v2 Versioning Policy

Status: accepted

## Decision

api-v2 uses explicit URI namespaces for externally visible API generations. Current
routes remain under the global `/api` prefix with controller-owned namespaces such
as `/consumer`, `/admin`, and `/admin-v2`.

New breaking API generations should introduce a new URI namespace, for example
`/api/admin-v3`, rather than enabling header-based NestJS versioning or adding
per-handler `@Version()` decorators.

## Rationale

- Existing consumers, admin clients, BFF routes, Swagger usage, and cookie scope
  checks already depend on visible route namespaces.
- URI namespaces make app-scope and authorization boundaries easy to audit in
  controllers, middleware, BFF proxies, logs, and support tooling.
- Header-based versioning would hide a major routing dimension from browser
  clients and same-origin BFF calls without solving a current compatibility
  problem.

## Rules

- Do not change existing endpoint paths for refactor-only work.
- Put breaking changes in a new URI namespace and keep the previous namespace
  available until its clients have migrated.
- Prefer additive changes within the current namespace when response shape and
  behavior remain backward compatible.
- Keep auth, CSRF, idempotency, audit, and step-up semantics identical unless a
  migration document explicitly calls out a behavior change.
- Update Swagger tags and BFF proxy paths when adding a new URI namespace.

## Non-Goals

- This policy does not enable NestJS `enableVersioning()`.
- This policy does not define a sunset schedule for existing routes.
- This policy does not rename `admin-v2`; that namespace is the current admin
  surface and remains supported.
