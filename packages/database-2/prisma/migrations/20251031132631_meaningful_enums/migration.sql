/*
  Warnings:

  - The values [business,contractor] on the enum `account_type_enum` will be removed. If these variants are still used in the database, this will fail.
  - The values [super,admin] on the enum `admin_type_enum` will be removed. If these variants are still used in the database, this will fail.
  - The values [entity,individual] on the enum `contractor_kind_enum` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "account_type_enum_new" AS ENUM ('Business', 'Contractor');
ALTER TYPE "account_type_enum" RENAME TO "account_type_enum_old";
ALTER TYPE "account_type_enum_new" RENAME TO "account_type_enum";
DROP TYPE "public"."account_type_enum_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "admin_type_enum_new" AS ENUM ('Super', 'Admin');
ALTER TYPE "admin_type_enum" RENAME TO "admin_type_enum_old";
ALTER TYPE "admin_type_enum_new" RENAME TO "admin_type_enum";
DROP TYPE "public"."admin_type_enum_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "contractor_kind_enum_new" AS ENUM ('Entity', 'Individual');
ALTER TYPE "contractor_kind_enum" RENAME TO "contractor_kind_enum_old";
ALTER TYPE "contractor_kind_enum_new" RENAME TO "contractor_kind_enum";
DROP TYPE "public"."contractor_kind_enum_old";
COMMIT;

-- AlterTable
ALTER TABLE "admin" ALTER COLUMN "type" SET DATA TYPE TEXT;
