/*
  Warnings:

  - You are about to drop the column `account_type` on the `consumer` table. All the data in the column will be lost.
  - You are about to drop the column `contractor_kind` on the `consumer` table. All the data in the column will be lost.
  - The `type` column on the `payment_request` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `type` on the `payment_method` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "payment_method_type_enum" AS ENUM ('Bank Account', 'Credit Card');

-- AlterTable
ALTER TABLE "consumer" DROP COLUMN "account_type",
DROP COLUMN "contractor_kind",
ADD COLUMN     "accountType" "account_type_enum",
ADD COLUMN     "contractorKind" "contractor_kind_enum";

-- AlterTable
ALTER TABLE "payment_method" DROP COLUMN "type",
ADD COLUMN     "type" "payment_method_type_enum" NOT NULL;

-- AlterTable
ALTER TABLE "payment_request" DROP COLUMN "type",
ADD COLUMN     "type" "payment_method_type_enum" NOT NULL DEFAULT 'Credit Card';

-- DropEnum
DROP TYPE "public"."payment_method_enum";

-- CreateIndex
CREATE UNIQUE INDEX "payment_method_type_last4_consumer_id_unique" ON "payment_method"("type", "last4", "consumer_id");
