# Align UUID defaults and TEXT types with schema

Ensures PK defaults use gen_random_uuid() and VARCHAR columns become TEXT where required by schema and repo standards.

**Reference:** UUID PK, naming; postgresql-design-rules Rule 4 (TEXT), Rule 5 (UUID).

## What this migration does

- Creates extension pgcrypto if not exists. Sets default for id columns to gen_random_uuid() on all UUID PK tables (access_refresh_token, address_details, admin, billing_details, consumer, etc.).
- Alters many VARCHAR columns to TEXT across address_details, admin, billing_details, consumer, and other tables per schema.

## Deploy order

1. **Run this migration** (e.g. `npx prisma migrate deploy`). No data loss; type compatibility (VARCHAR→TEXT) is safe.
2. **Deploy the application** (Prisma schema) that expects TEXT and gen_random_uuid(). No breaking change if schema already matches.

## Rollback

Revert column types to VARCHAR where applicable and revert id defaults. Possible but verbose; prefer fixing forward. No data loss from TEXT→VARCHAR if within length.
