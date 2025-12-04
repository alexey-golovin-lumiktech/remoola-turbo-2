-- DropForeignKey
ALTER TABLE "public"."address_details" DROP CONSTRAINT "address_details_consumerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."personal_details" DROP CONSTRAINT "personal_details_consumerId_fkey";

-- AddForeignKey
ALTER TABLE "address_details" ADD CONSTRAINT "address_details_consumerId_fkey" FOREIGN KEY ("consumerId") REFERENCES "consumer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_details" ADD CONSTRAINT "personal_details_consumerId_fkey" FOREIGN KEY ("consumerId") REFERENCES "consumer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
