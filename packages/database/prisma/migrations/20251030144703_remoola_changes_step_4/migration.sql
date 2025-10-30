/*
  Warnings:

  - A unique constraint covering the columns `[consumer_id]` on the table `address_details` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[consumerId]` on the table `google_profile_details` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[consumer_id]` on the table `organization_details` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[billing_details_id]` on the table `payment_method` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[consumer_id]` on the table `personal_details` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `consumer_id` to the `address_details` table without a default value. This is not possible if the table is not empty.
  - Added the required column `consumerId` to the `google_profile_details` table without a default value. This is not possible if the table is not empty.
  - Added the required column `consumer_id` to the `organization_details` table without a default value. This is not possible if the table is not empty.
  - Added the required column `consumer_id` to the `personal_details` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."consumer" DROP CONSTRAINT "consumer_address_details_id_foreign";

-- DropForeignKey
ALTER TABLE "public"."consumer" DROP CONSTRAINT "consumer_google_profile_details_id_foreign";

-- DropForeignKey
ALTER TABLE "public"."consumer" DROP CONSTRAINT "consumer_organization_details_id_foreign";

-- DropForeignKey
ALTER TABLE "public"."consumer" DROP CONSTRAINT "consumer_personal_details_id_foreign";

-- DropForeignKey
ALTER TABLE "public"."payment_method" DROP CONSTRAINT "payment_method_billing_details_id_foreign";

-- AlterTable
ALTER TABLE "address_details" ADD COLUMN     "consumer_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "google_profile_details" ADD COLUMN     "consumerId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "organization_details" ADD COLUMN     "consumer_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "personal_details" ADD COLUMN     "consumer_id" UUID NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "address_details_consumer_id_key" ON "address_details"("consumer_id");

-- CreateIndex
CREATE UNIQUE INDEX "google_profile_details_consumerId_key" ON "google_profile_details"("consumerId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_details_consumer_id_key" ON "organization_details"("consumer_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_method_billing_details_id_key" ON "payment_method"("billing_details_id");

-- CreateIndex
CREATE UNIQUE INDEX "personal_details_consumer_id_key" ON "personal_details"("consumer_id");

-- AddForeignKey
ALTER TABLE "address_details" ADD CONSTRAINT "address_details_consumer_id_fkey" FOREIGN KEY ("consumer_id") REFERENCES "consumer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_profile_details" ADD CONSTRAINT "google_profile_details_consumerId_fkey" FOREIGN KEY ("consumerId") REFERENCES "consumer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_details" ADD CONSTRAINT "organization_details_consumer_id_fkey" FOREIGN KEY ("consumer_id") REFERENCES "consumer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_method" ADD CONSTRAINT "payment_method_billing_details_id_fkey" FOREIGN KEY ("billing_details_id") REFERENCES "billing_details"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_details" ADD CONSTRAINT "personal_details_consumer_id_fkey" FOREIGN KEY ("consumer_id") REFERENCES "consumer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
