/*
  Warnings:

  - A unique constraint covering the columns `[consumerId,deleted_at]` on the table `address_details` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email,deleted_at]` on the table `admin` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email,deleted_at]` on the table `consumer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[consumer_id,resource_id,deleted_at]` on the table `consumer_resource` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[consumer_id,email,deleted_at]` on the table `contact` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[from_currency,to_currency,deleted_at]` on the table `exchange_rate` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[consumerId,deleted_at]` on the table `google_profile_details` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[consumerId,deleted_at]` on the table `organization_details` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[consumer_id,stripe_payment_method_id,deleted_at]` on the table `payment_method` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[consumer_id,stripe_fingerprint,deleted_at]` on the table `payment_method` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[payment_request_id,requester_id,resource_id,deleted_at]` on the table `payment_request_attachment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[consumerId,deleted_at]` on the table `personal_details` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "address_details_consumerId_deleted_at_idx";

-- DropIndex
DROP INDEX "admin_email_deleted_at_idx";

-- DropIndex
DROP INDEX "admin_email_key";

-- DropIndex
DROP INDEX "consumer_email_deleted_at_idx";

-- DropIndex
DROP INDEX "consumer_email_key";

-- DropIndex
DROP INDEX "consumer_resource_consumer_id_resource_id_key";

-- DropIndex
DROP INDEX "contact_consumer_id_email_key";

-- DropIndex
DROP INDEX "exchange_rate_from_currency_to_currency_key";

-- DropIndex
DROP INDEX "google_profile_details_consumerId_deleted_at_idx";

-- DropIndex
DROP INDEX "organization_details_consumerId_deleted_at_idx";

-- DropIndex
DROP INDEX "payment_method_billing_details_id_key";

-- DropIndex
DROP INDEX "payment_method_consumer_id_stripe_fingerprint_key";

-- DropIndex
DROP INDEX "payment_method_consumer_id_stripe_payment_method_id_key";

-- DropIndex
DROP INDEX "payment_request_attachment_payment_request_id_requester_id__key";

-- DropIndex
DROP INDEX "personal_details_consumerId_deleted_at_idx";

-- AlterTable
ALTER TABLE "access_refresh_token" ALTER COLUMN "access_token" SET DATA TYPE TEXT,
ALTER COLUMN "refresh_token" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "payment_method" ALTER COLUMN "billing_details_id" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "address_details_consumerId_deleted_at_key" ON "address_details"("consumerId", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "admin_email_deleted_at_key" ON "admin"("email", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "consumer_email_deleted_at_key" ON "consumer"("email", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "consumer_resource_consumer_id_resource_id_deleted_at_key" ON "consumer_resource"("consumer_id", "resource_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "contact_consumer_id_email_deleted_at_key" ON "contact"("consumer_id", "email", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rate_from_currency_to_currency_deleted_at_key" ON "exchange_rate"("from_currency", "to_currency", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "google_profile_details_consumerId_deleted_at_key" ON "google_profile_details"("consumerId", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "organization_details_consumerId_deleted_at_key" ON "organization_details"("consumerId", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_method_consumer_id_stripe_payment_method_id_deleted_key" ON "payment_method"("consumer_id", "stripe_payment_method_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_method_consumer_id_stripe_fingerprint_deleted_at_key" ON "payment_method"("consumer_id", "stripe_fingerprint", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_request_attachment_payment_request_id_requester_id__key" ON "payment_request_attachment"("payment_request_id", "requester_id", "resource_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "personal_details_consumerId_deleted_at_key" ON "personal_details"("consumerId", "deleted_at");
