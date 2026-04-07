## Why

Hard-cutover consumer auth/session routing away from `Origin` / `Referer` derived app identity.

This migration adds canonical `app_scope` storage to `auth_sessions` so every
consumer session can carry its own app namespace (`consumer`,
`consumer-mobile`, `consumer-css-grid`) independently of request headers.

`reset_password.app_scope` stays in place because forgot-password verify and
redirect flows are intentionally unauthenticated and cannot rely on an active
auth session.

## What changes

- Adds nullable-to-required `auth_sessions.app_scope` column in the same rollout
  as the runtime that always writes it.
- Adds an index covering `(consumer_id, app_scope, revoked_at)` for scoped
  session lookups and revocation checks.
- Recommended SQL-level guard: `CHECK (app_scope IN ('consumer','consumer-mobile','consumer-css-grid'))`.

## Safety

- Additive-first migration only.
- No destructive change to `reset_password`.
- This rollout is intentionally fail-closed: older consumer sessions without
  `app_scope` are treated as invalid by the runtime and require re-login.

## Rollout expectation

Apply the schema migration before deploying the runtime that reads
`AuthSessionModel.appScope`.
