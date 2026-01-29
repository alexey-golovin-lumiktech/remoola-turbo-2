/*
  Warnings:

  - The values [fees_included,no_fees_included] on the enum `fees_type_enum` will be removed. If these variants are still used in the database, this will fail.
  - The values [Sole trader] on the enum `legal_status_enum` will be removed. If these variants are still used in the database, this will fail.
  - The values [bank account,credit card] on the enum `payment_method_type_enum` will be removed. If these variants are still used in the database, this will fail.
  - The values [public,private] on the enum `resource_access_enum` will be removed. If these variants are still used in the database, this will fail.
  - The values [income,outcome] on the enum `transaction_action_type_enum` will be removed. If these variants are still used in the database, this will fail.
  - The values [draft,waiting,waiting recipient approval,pending,completed,denied,uncollectible] on the enum `transaction_status_enum` will be removed. If these variants are still used in the database, this will fail.
  - The values [credit card,bank transfer,currency exchange] on the enum `transaction_type_enum` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "fees_type_enum_new" AS ENUM ('Fees Included', 'No Fees Included');
ALTER TYPE "fees_type_enum" RENAME TO "fees_type_enum_old";
ALTER TYPE "fees_type_enum_new" RENAME TO "fees_type_enum";
DROP TYPE "public"."fees_type_enum_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "legal_status_enum_new" AS ENUM ('Individual', 'Individual entrepreneur', 'Sole Trader');
ALTER TYPE "legal_status_enum" RENAME TO "legal_status_enum_old";
ALTER TYPE "legal_status_enum_new" RENAME TO "legal_status_enum";
DROP TYPE "public"."legal_status_enum_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "payment_method_type_enum_new" AS ENUM ('Bank Account', 'Credit Card');
ALTER TYPE "payment_method_type_enum" RENAME TO "payment_method_type_enum_old";
ALTER TYPE "payment_method_type_enum_new" RENAME TO "payment_method_type_enum";
DROP TYPE "public"."payment_method_type_enum_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "resource_access_enum_new" AS ENUM ('Public', 'Private');
ALTER TYPE "resource_access_enum" RENAME TO "resource_access_enum_old";
ALTER TYPE "resource_access_enum_new" RENAME TO "resource_access_enum";
DROP TYPE "public"."resource_access_enum_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "transaction_action_type_enum_new" AS ENUM ('Income', 'Outcome');
ALTER TYPE "transaction_action_type_enum" RENAME TO "transaction_action_type_enum_old";
ALTER TYPE "transaction_action_type_enum_new" RENAME TO "transaction_action_type_enum";
DROP TYPE "public"."transaction_action_type_enum_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "transaction_status_enum_new" AS ENUM ('Draft', 'Waiting', 'Waiting Recipient Approval', 'Pending', 'Completed', 'Denied', 'Uncollectible');
ALTER TYPE "transaction_status_enum" RENAME TO "transaction_status_enum_old";
ALTER TYPE "transaction_status_enum_new" RENAME TO "transaction_status_enum";
DROP TYPE "public"."transaction_status_enum_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "transaction_type_enum_new" AS ENUM ('Credit Card', 'Bank Transfer', 'Currency Exchange');
ALTER TYPE "transaction_type_enum" RENAME TO "transaction_type_enum_old";
ALTER TYPE "transaction_type_enum_new" RENAME TO "transaction_type_enum";
DROP TYPE "public"."transaction_type_enum_old";
COMMIT;
