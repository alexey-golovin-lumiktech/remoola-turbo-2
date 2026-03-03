-- Align ExchangeRateStatus enum name with snake_case policy (Prisma @@map).
-- No data or column change; only the PostgreSQL type name changes.
ALTER TYPE "ExchangeRateStatus" RENAME TO "exchange_rate_status_enum";
