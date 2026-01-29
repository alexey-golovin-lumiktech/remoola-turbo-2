-- DropForeignKey
ALTER TABLE "public"."address_details" DROP CONSTRAINT "address_details_consumerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."consumer_resource" DROP CONSTRAINT "consumer_resource_consumer_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."contact" DROP CONSTRAINT "contact_consumer_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."google_profile_details" DROP CONSTRAINT "google_profile_details_consumerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."organization_details" DROP CONSTRAINT "organization_details_consumerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."payment_method" DROP CONSTRAINT "payment_method_consumer_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."personal_details" DROP CONSTRAINT "personal_details_consumerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."reset_password" DROP CONSTRAINT "reset_password_consumer_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."transaction" DROP CONSTRAINT "transaction_consumer_id_fkey";

-- AddForeignKey
ALTER TABLE "address_details" ADD CONSTRAINT "address_details_consumerId_fkey" FOREIGN KEY ("consumerId") REFERENCES "consumer"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consumer_resource" ADD CONSTRAINT "consumer_resource_consumer_id_fkey" FOREIGN KEY ("consumer_id") REFERENCES "consumer"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contact" ADD CONSTRAINT "contact_consumer_id_fkey" FOREIGN KEY ("consumer_id") REFERENCES "consumer"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "google_profile_details" ADD CONSTRAINT "google_profile_details_consumerId_fkey" FOREIGN KEY ("consumerId") REFERENCES "consumer"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "organization_details" ADD CONSTRAINT "organization_details_consumerId_fkey" FOREIGN KEY ("consumerId") REFERENCES "consumer"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_method" ADD CONSTRAINT "payment_method_consumer_id_fkey" FOREIGN KEY ("consumer_id") REFERENCES "consumer"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "personal_details" ADD CONSTRAINT "personal_details_consumerId_fkey" FOREIGN KEY ("consumerId") REFERENCES "consumer"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reset_password" ADD CONSTRAINT "reset_password_consumer_id_fkey" FOREIGN KEY ("consumer_id") REFERENCES "consumer"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_consumer_id_fkey" FOREIGN KEY ("consumer_id") REFERENCES "consumer"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
