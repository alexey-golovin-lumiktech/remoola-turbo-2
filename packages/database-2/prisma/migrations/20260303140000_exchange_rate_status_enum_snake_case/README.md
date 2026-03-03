# ExchangeRateStatus enum: snake_case DB name

Renames the PostgreSQL enum type from `"ExchangeRateStatus"` to `"exchange_rate_status_enum"` so the database matches the Prisma schema `@@map("exchange_rate_status_enum")` and the project's snake_case DB naming policy.

**Reference:** packages/database-2/prisma/MIGRATION_AUDIT.md (BLOCKER 1).

## What this migration does

- `ALTER TYPE "ExchangeRateStatus" RENAME TO "exchange_rate_status_enum"`.
- Additive naming only; no table/column/data changes. All columns using this type continue to work.

## Deploy order

1. `npx prisma migrate deploy` (or `migrate dev` in dev).
2. Deploy application (no code change required if Prisma client is regenerated after schema change).

## Rollback

```sql
ALTER TYPE "exchange_rate_status_enum" RENAME TO "ExchangeRateStatus";
```

Safe; reverts the type name only.
