/*
  Warnings:

  - The values [CREDIT_CARD,BANK_TRANSFER,CURRENCY_EXCHANGE] on the enum `transaction_type_enum` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "transaction_type_enum_new" AS ENUM ('INTERNAL_TRANSFER', 'WITHDRAWAL', 'PAYOUT');
ALTER TABLE "public"."payment_request" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "payment_request" ALTER COLUMN "type" TYPE "transaction_type_enum_new" USING ("type"::text::"transaction_type_enum_new");
ALTER TABLE "transaction" ALTER COLUMN "type" TYPE "transaction_type_enum_new" USING ("type"::text::"transaction_type_enum_new");
ALTER TYPE "transaction_type_enum" RENAME TO "transaction_type_enum_old";
ALTER TYPE "transaction_type_enum_new" RENAME TO "transaction_type_enum";
DROP TYPE "public"."transaction_type_enum_old";
ALTER TABLE "payment_request" ALTER COLUMN "type" SET DEFAULT 'PAYOUT';
COMMIT;

-- AlterTable
ALTER TABLE "payment_request" ALTER COLUMN "type" SET DEFAULT 'PAYOUT';
