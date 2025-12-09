/*
  Warnings:

  - The values [INTERNAL_TRANSFER,WITHDRAWAL,PAYOUT] on the enum `transaction_type_enum` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "transaction_type_enum_new" AS ENUM ('CREDIT_CARD', 'BANK_TRANSFER', 'CURRENCY_EXCHANGE');
ALTER TABLE "public"."payment_request" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "payment_request" ALTER COLUMN "type" TYPE "transaction_type_enum_new" USING ("type"::text::"transaction_type_enum_new");
ALTER TABLE "transaction" ALTER COLUMN "type" TYPE "transaction_type_enum_new" USING ("type"::text::"transaction_type_enum_new");
ALTER TYPE "transaction_type_enum" RENAME TO "transaction_type_enum_old";
ALTER TYPE "transaction_type_enum_new" RENAME TO "transaction_type_enum";
DROP TYPE "public"."transaction_type_enum_old";

-- AlterTable
ALTER TABLE "payment_request" ALTER COLUMN "type" SET DEFAULT 'CREDIT_CARD';
