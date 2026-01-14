/*
  Warnings:

  - You are about to alter the column `stripe_id` on the `ledger_entry` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `created_by` on the `ledger_entry` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `updated_by` on the `ledger_entry` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `deleted_by` on the `ledger_entry` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `stripe_payment_method_id` on the `payment_method` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `token` on the `reset_password` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - The `access` column on the `resource` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[consumer_id,email]` on the table `contact` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[idempotency_key]` on the table `ledger_entry` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[consumer_id,stripe_fingerprint]` on the table `payment_method` will be added. If there are existing duplicate values, this will fail.
  - Made the column `created_at` on table `access_refresh_token` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `access_refresh_token` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `address_details` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `address_details` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `admin` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `admin` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `billing_details` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `billing_details` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `consumer` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `consumer` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `consumer_resource` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `consumer_resource` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `contact` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `contact` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `exchange_rate` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `exchange_rate` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `google_profile_details` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `google_profile_details` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `organization_details` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `organization_details` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `payment_method` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `payment_method` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `payment_request` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `payment_request` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `payment_request_attachment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `payment_request_attachment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `personal_details` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `personal_details` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `reset_password` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `reset_password` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `resource` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `resource` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "payment_method"
DROP CONSTRAINT "payment_method_billing_details_id_fkey";

-- DropForeignKey
ALTER TABLE "resource_tag"
DROP CONSTRAINT "resource_tag_resource_id_fkey";

-- DropForeignKey
ALTER TABLE "resource_tag"
DROP CONSTRAINT "resource_tag_tag_id_fkey";

-- DropIndex
DROP INDEX "ledger_entry_payment_request_id_ledger_id_consumer_id_type_key";

-- DropIndex
DROP INDEX "payment_method_type_last4_consumer_id_key";

-- AlterTable
ALTER TABLE "access_refresh_token"
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "address_details"
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "admin"
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "billing_details"
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "consumer"
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "consumer_resource"
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "contact"
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "exchange_rate"
ALTER COLUMN "rate" SET DATA TYPE DECIMAL(18,8),
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "google_profile_details"
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "ledger_entry"
ADD COLUMN "idempotency_key" VARCHAR(128),
ALTER COLUMN "stripe_id" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "created_by" DROP NOT NULL,
ALTER COLUMN "created_by" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "updated_by" DROP NOT NULL,
ALTER COLUMN "updated_by" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "deleted_by" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "organization_details"
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "payment_method"
ADD COLUMN "bank_country" VARCHAR(2),
ADD COLUMN "bank_currency" "currency_code_enum",
ADD COLUMN "bank_last4" VARCHAR(4),
ADD COLUMN "bank_name" VARCHAR(255),
ADD COLUMN "stripe_fingerprint" VARCHAR(255),
ALTER COLUMN "brand" DROP NOT NULL,
ALTER COLUMN "last4" DROP NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "stripe_payment_method_id" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "payment_request"
ALTER COLUMN "created_by" DROP NOT NULL,
ALTER COLUMN "updated_by" DROP NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "type" DROP NOT NULL,
ALTER COLUMN "type" DROP DEFAULT;

-- AlterTable
ALTER TABLE "payment_request_attachment"
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "personal_details"
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "date_of_birth" SET DATA TYPE TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "reset_password"
ALTER COLUMN "token" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "resource"
DROP COLUMN "access",
ADD COLUMN "access" "resource_access_enum" NOT NULL DEFAULT 'PUBLIC',
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL;

-- CreateIndex
CREATE INDEX "access_refresh_token_identity_id_idx"
ON "access_refresh_token"("identity_id");

-- CreateIndex
CREATE INDEX "address_details_consumerId_deleted_at_idx"
ON "address_details"("consumerId", "deleted_at");

-- CreateIndex
CREATE INDEX "admin_email_deleted_at_idx"
ON "admin"("email", "deleted_at");

-- CreateIndex
CREATE INDEX "consumer_email_deleted_at_idx"
ON "consumer"("email", "deleted_at");

-- CreateIndex
CREATE INDEX "consumer_resource_consumer_id_deleted_at_idx"
ON "consumer_resource"("consumer_id", "deleted_at");

-- CreateIndex
CREATE INDEX "consumer_resource_resource_id_deleted_at_idx"
ON "consumer_resource"("resource_id", "deleted_at");

-- CreateIndex
CREATE INDEX "contact_consumer_id_idx"
ON "contact"("consumer_id");

-- CreateIndex
CREATE UNIQUE INDEX "contact_consumer_id_email_key"
ON "contact"("consumer_id", "email");

-- CreateIndex
CREATE INDEX "google_profile_details_consumerId_deleted_at_idx"
ON "google_profile_details"("consumerId", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_entry_idempotency_key_key"
ON "ledger_entry"("idempotency_key");

-- CreateIndex
CREATE INDEX "organization_details_consumerId_deleted_at_idx"
ON "organization_details"("consumerId", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_method_consumer_id_stripe_fingerprint_key"
ON "payment_method"("consumer_id", "stripe_fingerprint");

-- CreateIndex
CREATE INDEX "payment_request_payer_id_idx"
ON "payment_request"("payer_id");

-- CreateIndex
CREATE INDEX "payment_request_requester_id_idx"
ON "payment_request"("requester_id");

-- CreateIndex
CREATE INDEX "payment_request_status_idx"
ON "payment_request"("status");

-- CreateIndex
CREATE INDEX "payment_request_attachment_payment_request_id_idx"
ON "payment_request_attachment"("payment_request_id");

-- CreateIndex
CREATE INDEX "payment_request_attachment_requester_id_idx"
ON "payment_request_attachment"("requester_id");

-- CreateIndex
CREATE INDEX "payment_request_attachment_resource_id_idx"
ON "payment_request_attachment"("resource_id");

-- CreateIndex
CREATE INDEX "personal_details_consumerId_deleted_at_idx"
ON "personal_details"("consumerId", "deleted_at");

-- CreateIndex
CREATE INDEX "reset_password_consumer_id_idx"
ON "reset_password"("consumer_id");

-- CreateIndex
CREATE INDEX "reset_password_token_idx"
ON "reset_password"("token");

-- CreateIndex
CREATE INDEX "resource_access_idx"
ON "resource"("access");

-- CreateIndex
CREATE INDEX "resource_tag_resource_id_idx"
ON "resource_tag"("resource_id");

-- CreateIndex
CREATE INDEX "resource_tag_tag_id_idx"
ON "resource_tag"("tag_id");

-- AddForeignKey
ALTER TABLE "payment_method"
ADD CONSTRAINT "payment_method_billing_details_id_fkey"
FOREIGN KEY ("billing_details_id")
REFERENCES "billing_details"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_tag"
ADD CONSTRAINT "resource_tag_resource_id_fkey"
FOREIGN KEY ("resource_id")
REFERENCES "resource"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_tag"
ADD CONSTRAINT "resource_tag_tag_id_fkey"
FOREIGN KEY ("tag_id")
REFERENCES "document_tag"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
