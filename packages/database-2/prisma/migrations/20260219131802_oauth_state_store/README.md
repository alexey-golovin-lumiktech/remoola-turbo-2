# OAuth state: DB-backed state store

Stores OAuth flow state in the database (replacing Redis or in-memory store) for durability and multi-instance support.

**Reference:** Auth/OAuth; no AGENTS/postgresql-design-rules reference.

## What this migration does

- Creates table oauth_state (id, state_key unique, payload, expires_at, created_at).
- Creates index oauth_state_expires_at_idx for cleanup (e.g. DELETE WHERE expires_at < NOW()).

## Deploy order

1. **Run this migration** (e.g. `npx prisma migrate deploy`).
2. **Deploy the application** that writes/reads oauth_state and consumes state_key before redirect. Additive only.

## Rollback

Drop table oauth_state. All in-flight OAuth state is lost; users may need to restart OAuth flows.