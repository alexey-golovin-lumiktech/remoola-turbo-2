/*
  Warnings:

  - You are about to drop the `knex_migrations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `knex_migrations_lock` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "account_type_enum" AS ENUM ('Business', 'Contractor');

-- CreateEnum
CREATE TYPE "admin_type_enum" AS ENUM ('Super', 'Admin');

-- CreateEnum
CREATE TYPE "contractor_kind_enum" AS ENUM ('Entity', 'Individual');

-- CreateEnum
CREATE TYPE "currency_code_enum" AS ENUM ('USD', 'EUR', 'JPY', 'GBP', 'AUD', 'AZN', 'AMD', 'BYN', 'BGN', 'BRL', 'HUF', 'VND', 'HKD', 'GEL', 'DKK', 'AED', 'EGP', 'INR', 'IDR', 'KZT', 'CAD', 'QAR', 'KGS', 'CNY', 'MDL', 'NZD', 'NOK', 'PLN', 'RON', 'XDR', 'SGD', 'TJS', 'THB', 'TRY', 'TMT', 'UZS', 'UAH', 'CZK', 'SEK', 'CHF', 'RSD', 'ZAR', 'KRW', 'RUB');

-- CreateEnum
CREATE TYPE "fees_type_enum" AS ENUM ('Fees Included', 'No Fees Included');

-- CreateEnum
CREATE TYPE "legal_status_enum" AS ENUM ('Individual', 'Individual Entrepreneur', 'Sole trader');

-- CreateEnum
CREATE TYPE "organization_size_enum" AS ENUM ('1-10 team members', '11-100 team members', '100+ team members');

-- CreateEnum
CREATE TYPE "payment_method_enum" AS ENUM ('Bank Account', 'Credit Card');

-- CreateEnum
CREATE TYPE "resource_access_enum" AS ENUM ('Public', 'Private');

-- CreateEnum
CREATE TYPE "transaction_action_enum" AS ENUM ('Income', 'Outcome');

-- CreateEnum
CREATE TYPE "transaction_status_enum" AS ENUM ('Draft', 'Waiting', 'Waiting Recipient Approval', 'Pending', 'Completed', 'Denied', 'Uncollectible');

-- CreateEnum
CREATE TYPE "transaction_type_enum" AS ENUM ('Credit Card', 'Bank Transfer', 'Currency Exchange');

-- DropTable
DROP TABLE "public"."knex_migrations";

-- DropTable
DROP TABLE "public"."knex_migrations_lock";

-- DropEnum
DROP TYPE "public"."account_type_value_constraint";

-- DropEnum
DROP TYPE "public"."admin_type_value_constraint";

-- DropEnum
DROP TYPE "public"."contractor_kind_value_constraint";

-- DropEnum
DROP TYPE "public"."currency_code_value_constraint";

-- DropEnum
DROP TYPE "public"."fees_type_value_constraint";

-- DropEnum
DROP TYPE "public"."legal_status_value_constraint";

-- DropEnum
DROP TYPE "public"."organization_size_value_constraint";

-- DropEnum
DROP TYPE "public"."payment_method_type_value_constraint";

-- DropEnum
DROP TYPE "public"."resource_access_value_constraint";

-- DropEnum
DROP TYPE "public"."transaction_action_type_value_constraint";

-- DropEnum
DROP TYPE "public"."transaction_status_value_constraint";

-- DropEnum
DROP TYPE "public"."transaction_type_value_constraint";
