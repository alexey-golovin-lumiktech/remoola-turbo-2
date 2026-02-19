/*
  Warnings:

  - You are about to drop the `payment_request_expectation_date_archive` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "payment_request_expectation_date_archive";

-- RenameIndex
ALTER INDEX "idx_payment_method_billing_details_id" RENAME TO "payment_method_billing_details_id_idx";
