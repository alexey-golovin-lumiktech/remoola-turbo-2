/*
  Warnings:

  - You are about to drop the column `address_details_id` on the `consumer` table. All the data in the column will be lost.
  - You are about to drop the column `google_profile_details_id` on the `consumer` table. All the data in the column will be lost.
  - You are about to drop the column `organization_details_id` on the `consumer` table. All the data in the column will be lost.
  - You are about to drop the column `personal_details_id` on the `consumer` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[consumerId]` on the table `address_details` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[consumerId]` on the table `google_profile_details` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[consumerId]` on the table `organization_details` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[billing_details_id]` on the table `payment_method` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[consumerId]` on the table `personal_details` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `consumerId` to the `address_details` table without a default value. This is not possible if the table is not empty.
  - Added the required column `consumerId` to the `google_profile_details` table without a default value. This is not possible if the table is not empty.
  - Added the required column `consumerId` to the `organization_details` table without a default value. This is not possible if the table is not empty.
  - Made the column `billing_details_id` on table `payment_method` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `consumerId` to the `personal_details` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."consumer" DROP CONSTRAINT "consumer_address_details_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."consumer" DROP CONSTRAINT "consumer_google_profile_details_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."consumer" DROP CONSTRAINT "consumer_organization_details_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."consumer" DROP CONSTRAINT "consumer_personal_details_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."consumer_resource" DROP CONSTRAINT "consumer_resource_consumer_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."consumer_resource" DROP CONSTRAINT "consumer_resource_resource_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."contact" DROP CONSTRAINT "contact_consumer_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."payment_method" DROP CONSTRAINT "payment_method_billing_details_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."payment_method" DROP CONSTRAINT "payment_method_consumer_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."payment_request" DROP CONSTRAINT "payment_request_payer_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."payment_request" DROP CONSTRAINT "payment_request_requester_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."payment_request_attachment" DROP CONSTRAINT "payment_request_attachment_payment_request_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."payment_request_attachment" DROP CONSTRAINT "payment_request_attachment_requester_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."payment_request_attachment" DROP CONSTRAINT "payment_request_attachment_resource_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."reset_password" DROP CONSTRAINT "reset_password_consumer_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."transaction" DROP CONSTRAINT "transaction_consumer_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."transaction" DROP CONSTRAINT "transaction_payment_request_id_fkey";

-- AlterTable
ALTER TABLE "address_details" ADD COLUMN     "consumerId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "consumer" DROP COLUMN "address_details_id",
DROP COLUMN "google_profile_details_id",
DROP COLUMN "organization_details_id",
DROP COLUMN "personal_details_id";

-- AlterTable
ALTER TABLE "google_profile_details" ADD COLUMN     "consumerId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "organization_details" ADD COLUMN     "consumerId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "payment_method" ALTER COLUMN "billing_details_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "personal_details" ADD COLUMN     "consumerId" UUID NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "address_details_consumerId_key" ON "address_details"("consumerId");

-- CreateIndex
CREATE UNIQUE INDEX "google_profile_details_consumerId_key" ON "google_profile_details"("consumerId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_details_consumerId_key" ON "organization_details"("consumerId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_method_billing_details_id_key" ON "payment_method"("billing_details_id");

-- CreateIndex
CREATE UNIQUE INDEX "personal_details_consumerId_key" ON "personal_details"("consumerId");

-- AddForeignKey
ALTER TABLE "address_details" ADD CONSTRAINT "address_details_consumerId_fkey" FOREIGN KEY ("consumerId") REFERENCES "consumer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumer_resource" ADD CONSTRAINT "consumer_resource_consumer_id_fkey" FOREIGN KEY ("consumer_id") REFERENCES "consumer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumer_resource" ADD CONSTRAINT "consumer_resource_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact" ADD CONSTRAINT "contact_consumer_id_fkey" FOREIGN KEY ("consumer_id") REFERENCES "consumer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_profile_details" ADD CONSTRAINT "google_profile_details_consumerId_fkey" FOREIGN KEY ("consumerId") REFERENCES "consumer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_details" ADD CONSTRAINT "organization_details_consumerId_fkey" FOREIGN KEY ("consumerId") REFERENCES "consumer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_method" ADD CONSTRAINT "payment_method_billing_details_id_fkey" FOREIGN KEY ("billing_details_id") REFERENCES "billing_details"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_method" ADD CONSTRAINT "payment_method_consumer_id_fkey" FOREIGN KEY ("consumer_id") REFERENCES "consumer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_request" ADD CONSTRAINT "payment_request_payer_id_fkey" FOREIGN KEY ("payer_id") REFERENCES "consumer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_request" ADD CONSTRAINT "payment_request_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "consumer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_request_attachment" ADD CONSTRAINT "payment_request_attachment_payment_request_id_fkey" FOREIGN KEY ("payment_request_id") REFERENCES "payment_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_request_attachment" ADD CONSTRAINT "payment_request_attachment_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "consumer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_request_attachment" ADD CONSTRAINT "payment_request_attachment_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_details" ADD CONSTRAINT "personal_details_consumerId_fkey" FOREIGN KEY ("consumerId") REFERENCES "consumer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reset_password" ADD CONSTRAINT "reset_password_consumer_id_fkey" FOREIGN KEY ("consumer_id") REFERENCES "consumer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_consumer_id_fkey" FOREIGN KEY ("consumer_id") REFERENCES "consumer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_payment_request_id_fkey" FOREIGN KEY ("payment_request_id") REFERENCES "payment_request"("id") ON DELETE SET NULL ON UPDATE CASCADE;
