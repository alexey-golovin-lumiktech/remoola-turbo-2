/*
  Warnings:

  - A unique constraint covering the columns `[consumer_id,stripe_payment_method_id]` on the table `payment_method` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "payment_method" ADD COLUMN     "stripe_payment_method_id" TEXT;

-- CreateIndex
CREATE INDEX "payment_method_consumer_id_idx" ON "payment_method"("consumer_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_method_consumer_id_stripe_payment_method_id_key" ON "payment_method"("consumer_id", "stripe_payment_method_id");
