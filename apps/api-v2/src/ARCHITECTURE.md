# API v2 Source Layout

This app uses feature-first Nest modules with a small set of shared source zones.
Keep new code close to the feature that owns the behavior, and move it out only
when multiple verticals need the same capability.

## Source Zones

- `common`: Nest and HTTP primitives. Use this for decorators, guards, filters,
  middleware, interceptors, response contracts, and request/query DTO helpers.
- `infrastructure`: external adapters and low-level providers. Use this for
  storage, ingress, third-party clients, and provider lifecycle wrappers.
- `shared`: cross-domain application services. Use this for audit, mailing,
  balance calculation, Prisma infrastructure, scheduler policy, money utilities,
  and transaction status utilities.
- `shared-common`: legacy contracts, constants, validators, DTO/model shapes, and
  compatibility helpers. Do not add new application services here.

## Dependency Rules

- `admin-v2` and `consumer` may depend on `common`, `shared`, `shared-common`,
  and `infrastructure`.
- `admin-v2` must not import implementation files from `consumer/modules`.
- `infrastructure` must not depend on `admin-v2` or `consumer`.
- Feature modules should export facades and keep repositories, workflow services,
  and adapters private unless another module has a concrete dependency.
