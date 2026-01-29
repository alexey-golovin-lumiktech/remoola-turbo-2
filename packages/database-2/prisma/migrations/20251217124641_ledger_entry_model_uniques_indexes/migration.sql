/*
  Warnings:

  - A unique constraint covering the columns `[payment_request_id,ledger_id,consumer_id,type]` on the table `ledger_entry` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ledger_entry_payment_request_id_ledger_id_type_key";

-- CreateIndex
CREATE INDEX "ledger_entry_payment_request_id_idx" ON "ledger_entry"("payment_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_entry_payment_request_id_ledger_id_consumer_id_type_key" ON "ledger_entry"("payment_request_id", "ledger_id", "consumer_id", "type");
