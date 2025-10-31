-- CreateEnum
CREATE TYPE "account_type_enum" AS ENUM ('business', 'contractor');

-- CreateEnum
CREATE TYPE "admin_type_enum" AS ENUM ('super', 'admin');

-- CreateEnum
CREATE TYPE "contractor_kind_enum" AS ENUM ('entity', 'individual');

-- CreateEnum
CREATE TYPE "currency_code_enum" AS ENUM ('USD', 'EUR', 'JPY', 'GBP', 'AUD', 'AZN', 'AMD', 'BYN', 'BGN', 'BRL', 'HUF', 'VND', 'HKD', 'GEL', 'DKK', 'AED', 'EGP', 'INR', 'IDR', 'KZT', 'CAD', 'QAR', 'KGS', 'CNY', 'MDL', 'NZD', 'NOK', 'PLN', 'RON', 'XDR', 'SGD', 'TJS', 'THB', 'TRY', 'TMT', 'UZS', 'UAH', 'CZK', 'SEK', 'CHF', 'RSD', 'ZAR', 'KRW', 'RUB');

-- CreateEnum
CREATE TYPE "fees_type_enum" AS ENUM ('fees_included', 'no_fees_included');

-- CreateEnum
CREATE TYPE "legal_status_enum" AS ENUM ('Individual', 'Individual entrepreneur', 'Sole trader');

-- CreateEnum
CREATE TYPE "organization_size_enum" AS ENUM ('1-10 team members', '11-100 team members', '100+ team members');

-- CreateEnum
CREATE TYPE "payment_method_type_enum" AS ENUM ('bank account', 'credit card');

-- CreateEnum
CREATE TYPE "resource_access_enum" AS ENUM ('public', 'private');

-- CreateEnum
CREATE TYPE "transaction_action_type_enum" AS ENUM ('income', 'outcome');

-- CreateEnum
CREATE TYPE "transaction_status_enum" AS ENUM ('draft', 'waiting', 'waiting recipient approval', 'pending', 'completed', 'denied', 'uncollectible');

-- CreateEnum
CREATE TYPE "transaction_type_enum" AS ENUM ('credit card', 'bank transfer', 'currency exchange');

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
