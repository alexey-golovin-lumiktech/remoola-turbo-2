# Auth: audit log and login lockout

Adds tables for auth event auditing and login rate limiting (lockout).

**Reference:** auth/session; postgresql-design-rules (timestamps, PKs).

## What this migration does

- Creates table auth_audit_log (id, identity_type, identity_id, email, event, ip_address, user_agent, created_at) with indexes on (email, created_at) and (identity_id, created_at).
- Creates table auth_login_lockout (identity_type, email as composite PK, attempt_count, first_attempt_at, locked_until, updated_at).

## Deploy order

1. **Run this migration** (e.g. `npx prisma migrate deploy`).
2. **Deploy the application** that writes to auth_audit_log and auth_login_lockout and enforces lockout. Additive only.

## Rollback

Drop tables auth_audit_log and auth_login_lockout. All audit and lockout data is lost.
