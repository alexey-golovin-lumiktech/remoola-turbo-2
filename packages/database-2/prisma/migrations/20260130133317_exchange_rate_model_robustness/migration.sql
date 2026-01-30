/*
  Warnings:

  - A unique constraint covering the columns `[from_currency,to_currency,effective_at,deleted_at]` on the table `exchange_rate` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ExchangeRateStatus" AS ENUM ('DRAFT', 'APPROVED', 'DISABLED');

-- DropIndex
DROP INDEX "exchange_rate_from_currency_to_currency_deleted_at_key";

-- AlterTable
ALTER TABLE "exchange_rate" ADD COLUMN     "approved_at" TIMESTAMPTZ(6),
ADD COLUMN     "approved_by" UUID,
ADD COLUMN     "confidence" INTEGER,
ADD COLUMN     "created_by" UUID,
ADD COLUMN     "effective_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "expires_at" TIMESTAMPTZ(6),
ADD COLUMN     "fetched_at" TIMESTAMPTZ(6),
ADD COLUMN     "provider" VARCHAR(255),
ADD COLUMN     "provider_rate_id" VARCHAR(255),
ADD COLUMN     "rate_ask" DECIMAL(18,8),
ADD COLUMN     "rate_bid" DECIMAL(18,8),
ADD COLUMN     "spread_bps" INTEGER,
ADD COLUMN     "status" "ExchangeRateStatus" NOT NULL DEFAULT 'APPROVED',
ADD COLUMN     "updated_by" UUID;

-- Backfill effective_at and de-duplicate per pair
UPDATE "exchange_rate"
SET "effective_at" = "created_at";

WITH ranked AS (
  SELECT
    "id",
    "effective_at",
    ROW_NUMBER() OVER (
      PARTITION BY "from_currency", "to_currency", "deleted_at", "effective_at"
      ORDER BY "created_at", "id"
    ) AS rn
  FROM "exchange_rate"
)
UPDATE "exchange_rate" AS er
SET "effective_at" = er."effective_at" + ((ranked.rn - 1) * INTERVAL '1 second')
FROM ranked
WHERE er."id" = ranked."id"
  AND ranked.rn > 1;

-- CreateIndex
CREATE INDEX "exchange_rate_from_currency_to_currency_status_deleted_at_idx" ON "exchange_rate"("from_currency", "to_currency", "status", "deleted_at");

-- CreateIndex
CREATE INDEX "exchange_rate_effective_at_expires_at_idx" ON "exchange_rate"("effective_at", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rate_from_currency_to_currency_effective_at_delete_key" ON "exchange_rate"("from_currency", "to_currency", "effective_at", "deleted_at");

-- RenameIndex
ALTER INDEX "scheduled_fx_conversion_consumer_status_idx" RENAME TO "scheduled_fx_conversion_consumer_id_status_idx";

-- RenameIndex
ALTER INDEX "scheduled_fx_conversion_execute_status_idx" RENAME TO "scheduled_fx_conversion_execute_at_status_idx";

-- RenameIndex
ALTER INDEX "wallet_auto_conversion_rule_consumer_enabled_idx" RENAME TO "wallet_auto_conversion_rule_consumer_id_enabled_deleted_at_idx";
