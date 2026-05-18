# API v2 NestJS Conventions

Дата: 2026-05-18

Область: `apps/api-v2/src`

## Decision

`api-v2` keeps Nest framework concerns at the HTTP boundary and keeps business logic in services/repositories/presenters. New code should follow these rules unless a local domain invariant needs a documented exception.

## Route Parameters

- Do not accept bare `@Param('id') id: string` for resource identifiers.
- Use a domain-specific parameter decorator or pipe, for example `@UuidParam('id') id: string`.
- If an identifier is not a UUID, introduce an explicit domain pipe/decorator with a clear name and Swagger metadata near the controller route.

## DTOs And Query Objects

- DTOs that represent public API contracts belong in local `*.dto.ts` files once they are reused, documented, or non-trivial.
- Controllers may keep only very small private DTOs for one-off internal endpoints.
- Shared query primitives live under `common/dto` and should be preferred for pagination, date ranges, and boolean/string/number query coercion.
- Input DTOs must use `@Expose()` because the global `ValidationPipe` uses `excludeExtraneousValues`.

## Response Contracts

- Public admin-v2 and consumer routes should declare response posture explicitly:
  - typed response DTO plus `@ApiOkResponse`/`@ApiCreatedResponse`, or
  - a documented plain-object exception when the endpoint is transitional or internal.
- If a route uses response DTO classes, prefer `@TransformResponse(...)` so the runtime JSON matches the documented contract.
- Do not rely on service return shapes as the only API contract for money-touching or auth-touching routes.

## Throttling

- Avoid copy-pasting raw `@Throttle({ default: { limit, ttl } })` values into new controllers.
- Prefer named policy decorators so intent is visible at the route boundary.
- Mutating admin routes, auth routes, and step-up routes should have stricter policies than read-only list/detail routes.

## Transactions

- Admin-v2 repositories should use `PrismaTransactionRunner` rather than direct `$transaction`.
- Ledger mutations must use the ledger transaction policy.
- Non-transactional idempotency executions need an allowlisted reason in the architecture test.

## Testing Guardrails

Architecture tests should block expansion of known debt:

- bare route identifier parameters,
- new large inline DTOs in controllers,
- direct admin-v2 repository `$transaction`,
- undocumented response-contract posture for public routes.
