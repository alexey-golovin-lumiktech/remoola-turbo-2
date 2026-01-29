/*
  Warnings:

  - You are about to drop the `transaction` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ledger_entry_type_enum" AS ENUM ('USER_PAYMENT', 'USER_PAYMENT_REVERSAL', 'PLATFORM_FEE', 'PLATFORM_FEE_REVERSAL', 'USER_DEPOSIT', 'USER_DEPOSIT_REVERSAL', 'USER_PAYOUT', 'USER_PAYOUT_REVERSAL', 'INTERNAL_TRANSFER', 'CURRENCY_EXCHANGE');

-- DropForeignKey
ALTER TABLE "transaction" DROP CONSTRAINT "transaction_consumer_id_fkey";

-- DropForeignKey
ALTER TABLE "transaction" DROP CONSTRAINT "transaction_payment_request_id_fkey";

-- DropTable
DROP TABLE "transaction";

-- CreateTable
CREATE TABLE "ledger_entry" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "ledger_id" UUID NOT NULL,
    "type" "ledger_entry_type_enum" NOT NULL,
    "currencyCode" "currency_code_enum" NOT NULL,
    "status" "transaction_status_enum" NOT NULL,
    "amount" DECIMAL(9,2) NOT NULL,
    "feesType" "transaction_fees_type_enum" DEFAULT 'NO_FEES_INCLUDED',
    "feesAmount" DECIMAL(9,2),
    "stripe_id" TEXT,
    "metadata" JSONB,
    "consumer_id" UUID NOT NULL,
    "payment_request_id" UUID,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_by" TEXT,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "ledger_entry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ledger_entry_consumer_id_idx" ON "ledger_entry"("consumer_id");

-- CreateIndex
CREATE INDEX "ledger_entry_ledger_id_idx" ON "ledger_entry"("ledger_id");

-- AddForeignKey
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_consumer_id_fkey" FOREIGN KEY ("consumer_id") REFERENCES "consumer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_payment_request_id_fkey" FOREIGN KEY ("payment_request_id") REFERENCES "payment_request"("id") ON DELETE SET NULL ON UPDATE CASCADE;
