/*
  Warnings:

  - The values [Business,Contractor] on the enum `account_type_enum` will be removed. If these variants are still used in the database, this will fail.
  - The values [Super,Admin] on the enum `admin_type_enum` will be removed. If these variants are still used in the database, this will fail.
  - The values [Entity,Individual] on the enum `contractor_kind_enum` will be removed. If these variants are still used in the database, this will fail.
  - The values [Individual,Individual entrepreneur,Sole Trader] on the enum `legal_status_enum` will be removed. If these variants are still used in the database, this will fail.
  - The values [1-10 team members,11-100 team members,100+ team members] on the enum `organization_size_enum` will be removed. If these variants are still used in the database, this will fail.
  - The values [Bank Account,Credit Card] on the enum `payment_method_type_enum` will be removed. If these variants are still used in the database, this will fail.
  - The values [Public,Private] on the enum `resource_access_enum` will be removed. If these variants are still used in the database, this will fail.
  - The values [Income,Outcome] on the enum `transaction_action_type_enum` will be removed. If these variants are still used in the database, this will fail.
  - The values [Fees Included,No Fees Included] on the enum `transaction_fees_type_enum` will be removed. If these variants are still used in the database, this will fail.
  - The values [Draft,Waiting,Waiting Recipient Approval,Pending,Completed,Denied,Uncollectible] on the enum `transaction_status_enum` will be removed. If these variants are still used in the database, this will fail.
  - The values [Credit Card,Bank Transfer,Currency Exchange] on the enum `transaction_type_enum` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "account_type_enum_new" AS ENUM ('BUSINESS', 'CONTRACTOR');
ALTER TABLE "consumer" ALTER COLUMN "account_type" TYPE "account_type_enum_new" USING ("account_type"::text::"account_type_enum_new");
ALTER TYPE "account_type_enum" RENAME TO "account_type_enum_old";
ALTER TYPE "account_type_enum_new" RENAME TO "account_type_enum";
DROP TYPE "public"."account_type_enum_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "admin_type_enum_new" AS ENUM ('SUPER', 'ADMIN');
ALTER TABLE "public"."admin" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "admin" ALTER COLUMN "type" TYPE "admin_type_enum_new" USING ("type"::text::"admin_type_enum_new");
ALTER TYPE "admin_type_enum" RENAME TO "admin_type_enum_old";
ALTER TYPE "admin_type_enum_new" RENAME TO "admin_type_enum";
DROP TYPE "public"."admin_type_enum_old";
ALTER TABLE "admin" ALTER COLUMN "type" SET DEFAULT 'ADMIN';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "contractor_kind_enum_new" AS ENUM ('ENTITY', 'INDIVIDUAL');
ALTER TABLE "consumer" ALTER COLUMN "contractor_kind" TYPE "contractor_kind_enum_new" USING ("contractor_kind"::text::"contractor_kind_enum_new");
ALTER TYPE "contractor_kind_enum" RENAME TO "contractor_kind_enum_old";
ALTER TYPE "contractor_kind_enum_new" RENAME TO "contractor_kind_enum";
DROP TYPE "public"."contractor_kind_enum_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "legal_status_enum_new" AS ENUM ('INDIVIDUAL', 'INDIVIDUAL_ENTREPRENEUR', 'SOLE_TRADER');
ALTER TABLE "personal_details" ALTER COLUMN "legal_status" TYPE "legal_status_enum_new" USING ("legal_status"::text::"legal_status_enum_new");
ALTER TYPE "legal_status_enum" RENAME TO "legal_status_enum_old";
ALTER TYPE "legal_status_enum_new" RENAME TO "legal_status_enum";
DROP TYPE "public"."legal_status_enum_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "organization_size_enum_new" AS ENUM ('SMALL', 'MEDIUM', 'LARGE');
ALTER TABLE "public"."organization_details" ALTER COLUMN "size" DROP DEFAULT;
ALTER TABLE "organization_details" ALTER COLUMN "size" TYPE "organization_size_enum_new" USING ("size"::text::"organization_size_enum_new");
ALTER TYPE "organization_size_enum" RENAME TO "organization_size_enum_old";
ALTER TYPE "organization_size_enum_new" RENAME TO "organization_size_enum";
DROP TYPE "public"."organization_size_enum_old";
ALTER TABLE "organization_details" ALTER COLUMN "size" SET DEFAULT 'SMALL';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "payment_method_type_enum_new" AS ENUM ('BANK_ACCOUNT', 'CREDIT_CARD');
ALTER TABLE "payment_method" ALTER COLUMN "type" TYPE "payment_method_type_enum_new" USING ("type"::text::"payment_method_type_enum_new");
ALTER TYPE "payment_method_type_enum" RENAME TO "payment_method_type_enum_old";
ALTER TYPE "payment_method_type_enum_new" RENAME TO "payment_method_type_enum";
DROP TYPE "public"."payment_method_type_enum_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "resource_access_enum_new" AS ENUM ('PUBLIC', 'PRIVATE');
ALTER TYPE "resource_access_enum" RENAME TO "resource_access_enum_old";
ALTER TYPE "resource_access_enum_new" RENAME TO "resource_access_enum";
DROP TYPE "public"."resource_access_enum_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "transaction_action_type_enum_new" AS ENUM ('INCOME', 'OUTCOME');
ALTER TABLE "transaction" ALTER COLUMN "action_type" TYPE "transaction_action_type_enum_new" USING ("action_type"::text::"transaction_action_type_enum_new");
ALTER TYPE "transaction_action_type_enum" RENAME TO "transaction_action_type_enum_old";
ALTER TYPE "transaction_action_type_enum_new" RENAME TO "transaction_action_type_enum";
DROP TYPE "public"."transaction_action_type_enum_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "transaction_fees_type_enum_new" AS ENUM ('FEES_INCLUDED', 'NO_FEES_INCLUDED');
ALTER TABLE "public"."transaction" ALTER COLUMN "fees_type" DROP DEFAULT;
ALTER TABLE "transaction" ALTER COLUMN "fees_type" TYPE "transaction_fees_type_enum_new" USING ("fees_type"::text::"transaction_fees_type_enum_new");
ALTER TYPE "transaction_fees_type_enum" RENAME TO "transaction_fees_type_enum_old";
ALTER TYPE "transaction_fees_type_enum_new" RENAME TO "transaction_fees_type_enum";
DROP TYPE "public"."transaction_fees_type_enum_old";
ALTER TABLE "transaction" ALTER COLUMN "fees_type" SET DEFAULT 'NO_FEES_INCLUDED';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "transaction_status_enum_new" AS ENUM ('DRAFT', 'WAITING', 'WAITING_RECIPIENT_APPROVAL', 'PENDING', 'COMPLETED', 'DENIED', 'UNCOLLECTIBLE');
ALTER TABLE "public"."payment_request" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "payment_request" ALTER COLUMN "status" TYPE "transaction_status_enum_new" USING ("status"::text::"transaction_status_enum_new");
ALTER TABLE "transaction" ALTER COLUMN "status" TYPE "transaction_status_enum_new" USING ("status"::text::"transaction_status_enum_new");
ALTER TYPE "transaction_status_enum" RENAME TO "transaction_status_enum_old";
ALTER TYPE "transaction_status_enum_new" RENAME TO "transaction_status_enum";
DROP TYPE "public"."transaction_status_enum_old";
ALTER TABLE "payment_request" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "transaction_type_enum_new" AS ENUM ('CREDIT_CARD', 'BANK_TRANSFER', 'CURRENCY_EXCHANGE');
ALTER TABLE "public"."payment_request" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "payment_request" ALTER COLUMN "type" TYPE "transaction_type_enum_new" USING ("type"::text::"transaction_type_enum_new");
ALTER TABLE "transaction" ALTER COLUMN "type" TYPE "transaction_type_enum_new" USING ("type"::text::"transaction_type_enum_new");
ALTER TYPE "transaction_type_enum" RENAME TO "transaction_type_enum_old";
ALTER TYPE "transaction_type_enum_new" RENAME TO "transaction_type_enum";
DROP TYPE "public"."transaction_type_enum_old";
ALTER TABLE "payment_request" ALTER COLUMN "type" SET DEFAULT 'CREDIT_CARD';
COMMIT;

-- AlterTable
ALTER TABLE "admin" ALTER COLUMN "type" SET DEFAULT 'ADMIN';

-- AlterTable
ALTER TABLE "organization_details" ALTER COLUMN "size" SET DEFAULT 'SMALL';

-- AlterTable
ALTER TABLE "payment_request" ALTER COLUMN "status" SET DEFAULT 'DRAFT',
ALTER COLUMN "type" SET DEFAULT 'CREDIT_CARD';

-- AlterTable
ALTER TABLE "transaction" ALTER COLUMN "fees_type" SET DEFAULT 'NO_FEES_INCLUDED';
