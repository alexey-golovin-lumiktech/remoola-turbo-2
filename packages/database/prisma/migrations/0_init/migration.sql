CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateEnum
CREATE TYPE "account_type_value_constraint" AS ENUM ('business', 'contractor');

-- CreateEnum
CREATE TYPE "admin_type_value_constraint" AS ENUM ('super', 'admin');

-- CreateEnum
CREATE TYPE "contractor_kind_value_constraint" AS ENUM ('entity', 'individual');

-- CreateEnum
CREATE TYPE "currency_code_value_constraint" AS ENUM ('USD', 'EUR', 'JPY', 'GBP', 'AUD', 'AZN', 'AMD', 'BYN', 'BGN', 'BRL', 'HUF', 'VND', 'HKD', 'GEL', 'DKK', 'AED', 'EGP', 'INR', 'IDR', 'KZT', 'CAD', 'QAR', 'KGS', 'CNY', 'MDL', 'NZD', 'NOK', 'PLN', 'RON', 'XDR', 'SGD', 'TJS', 'THB', 'TRY', 'TMT', 'UZS', 'UAH', 'CZK', 'SEK', 'CHF', 'RSD', 'ZAR', 'KRW', 'RUB');

-- CreateEnum
CREATE TYPE "fees_type_value_constraint" AS ENUM ('fees_included', 'no_fees_included');

-- CreateEnum
CREATE TYPE "legal_status_value_constraint" AS ENUM ('Individual', 'Individual entrepreneur', 'Sole trader');

-- CreateEnum
CREATE TYPE "organization_size_value_constraint" AS ENUM ('1-10 team members', '11-100 team members', '100+ team members');

-- CreateEnum
CREATE TYPE "payment_method_type_value_constraint" AS ENUM ('bank account', 'credit card');

-- CreateEnum
CREATE TYPE "resource_access_value_constraint" AS ENUM ('public', 'private');

-- CreateEnum
CREATE TYPE "transaction_action_type_value_constraint" AS ENUM ('income', 'outcome');

-- CreateEnum
CREATE TYPE "transaction_status_value_constraint" AS ENUM ('draft', 'waiting', 'waiting recipient approval', 'pending', 'completed', 'denied', 'uncollectible');

-- CreateEnum
CREATE TYPE "transaction_type_value_constraint" AS ENUM ('credit card', 'bank transfer', 'currency exchange');

-- CreateTable
CREATE TABLE "access_refresh_token" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "identity_id" UUID NOT NULL,
    "access_token" VARCHAR(255) NOT NULL,
    "refresh_token" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "access_refresh_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "address_details" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "postal_code" VARCHAR(255) NOT NULL,
    "country" VARCHAR(255) NOT NULL,
    "state" VARCHAR(255),
    "city" VARCHAR(255),
    "street" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "address_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "email" VARCHAR(255) NOT NULL,
    "type" VARCHAR(255) NOT NULL DEFAULT 'admin',
    "password" VARCHAR(255) NOT NULL,
    "salt" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_details" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "email" VARCHAR(255),
    "name" VARCHAR(255),
    "phone" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "billing_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consumer" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "email" VARCHAR(255) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "legal_verified" BOOLEAN NOT NULL DEFAULT false,
    "password" VARCHAR(255),
    "salt" VARCHAR(255),
    "first_name" VARCHAR(255),
    "last_name" VARCHAR(255),
    "account_type" VARCHAR(255),
    "contractor_kind" VARCHAR(255),
    "how_did_hear_about_us" VARCHAR(255),
    "stripe_customer_id" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    "google_profile_details_id" UUID,
    "personal_details_id" UUID,
    "address_details_id" UUID,
    "organization_details_id" UUID,

    CONSTRAINT "consumer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consumer_resource" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "consumer_id" UUID NOT NULL,
    "resource_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "consumer_resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "consumer_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255),
    "address" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchange_rate" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "from_currency" VARCHAR(255) NOT NULL,
    "to_currency" VARCHAR(255) NOT NULL,
    "rate" DECIMAL(11,4) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "exchange_rate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "google_profile_details" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "email" VARCHAR(255) NOT NULL,
    "email_verified" BOOLEAN NOT NULL,
    "name" VARCHAR(255),
    "given_name" VARCHAR(255),
    "family_name" VARCHAR(255),
    "picture" VARCHAR(255),
    "organization" VARCHAR(255),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "google_profile_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knex_migrations" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255),
    "batch" INTEGER,
    "migration_time" TIMESTAMPTZ(6),

    CONSTRAINT "knex_migrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knex_migrations_lock" (
    "index" SERIAL NOT NULL,
    "is_locked" INTEGER,

    CONSTRAINT "knex_migrations_lock_pkey" PRIMARY KEY ("index")
);

-- CreateTable
CREATE TABLE "organization_details" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "consumer_role" VARCHAR(255) NOT NULL,
    "size" VARCHAR(255) NOT NULL DEFAULT '1-10 team members',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "organization_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_method" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "consumer_id" UUID NOT NULL,
    "billing_details_id" UUID,
    "default_selected" BOOLEAN NOT NULL DEFAULT false,
    "type" VARCHAR(255) NOT NULL,
    "brand" VARCHAR(255) NOT NULL,
    "last4" VARCHAR(4) NOT NULL,
    "service_fee" INTEGER NOT NULL DEFAULT 0,
    "exp_month" VARCHAR(2),
    "exp_year" VARCHAR(4),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "payment_method_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_request" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "requester_id" UUID NOT NULL,
    "payer_id" UUID NOT NULL,
    "amount" DECIMAL(9,2) NOT NULL,
    "currency_code" VARCHAR(255) NOT NULL DEFAULT 'USD',
    "status" VARCHAR(255) NOT NULL DEFAULT 'draft',
    "type" VARCHAR(255) NOT NULL DEFAULT 'credit card',
    "description" TEXT,
    "due_date" TIMESTAMPTZ(6),
    "expectation_date" TIMESTAMPTZ(6),
    "sent_date" TIMESTAMPTZ(6),
    "created_by" VARCHAR(255) NOT NULL,
    "updated_by" VARCHAR(255) NOT NULL,
    "deleted_by" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "payment_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_request_attachment" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "requester_id" UUID NOT NULL,
    "payment_request_id" UUID NOT NULL,
    "resource_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "payment_request_attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_details" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "citizen_of" VARCHAR(255) NOT NULL,
    "date_of_birth" VARCHAR(255) NOT NULL,
    "passport_or_id_number" VARCHAR(255) NOT NULL,
    "legal_status" VARCHAR(255),
    "country_of_tax_residence" VARCHAR(255),
    "tax_id" VARCHAR(255),
    "phone_number" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "personal_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reset_password" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "consumer_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expired_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "reset_password_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "access" TEXT NOT NULL DEFAULT 'public',
    "originalname" VARCHAR(255) NOT NULL,
    "mimetype" VARCHAR(255) NOT NULL,
    "size" INTEGER NOT NULL,
    "bucket" VARCHAR(255) NOT NULL,
    "key" VARCHAR(255) NOT NULL,
    "download_url" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "consumer_id" UUID NOT NULL,
    "code" VARCHAR(6) NOT NULL DEFAULT substr(md5((now())::text), 0, 7),
    "type" VARCHAR(255) NOT NULL,
    "origin_amount" DECIMAL(9,2) NOT NULL,
    "currency_code" VARCHAR(255) NOT NULL,
    "action_type" VARCHAR(255) NOT NULL,
    "status" VARCHAR(255) NOT NULL,
    "payment_request_id" UUID,
    "fees_type" VARCHAR(255) DEFAULT 'no_fees_included',
    "fees_amount" DECIMAL(9,2),
    "stripe_id" VARCHAR(255),
    "stripe_fee_in_percents" INTEGER,
    "created_by" VARCHAR(255) NOT NULL,
    "updated_by" VARCHAR(255) NOT NULL,
    "deleted_by" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_email_unique" ON "admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "consumer_email_unique" ON "consumer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "consumer_resource_consumer_id_resource_id_unique" ON "consumer_resource"("consumer_id", "resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rate_from_currency_to_currency_unique" ON "exchange_rate"("from_currency", "to_currency");

-- CreateIndex
CREATE UNIQUE INDEX "payment_method_type_last4_consumer_id_unique" ON "payment_method"("type", "last4", "consumer_id");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_payment_request_id_code_unique" ON "transaction"("payment_request_id", "code");

-- AddForeignKey
ALTER TABLE "consumer" ADD CONSTRAINT "consumer_address_details_id_foreign" FOREIGN KEY ("address_details_id") REFERENCES "address_details"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consumer" ADD CONSTRAINT "consumer_google_profile_details_id_foreign" FOREIGN KEY ("google_profile_details_id") REFERENCES "google_profile_details"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consumer" ADD CONSTRAINT "consumer_organization_details_id_foreign" FOREIGN KEY ("organization_details_id") REFERENCES "organization_details"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consumer" ADD CONSTRAINT "consumer_personal_details_id_foreign" FOREIGN KEY ("personal_details_id") REFERENCES "personal_details"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consumer_resource" ADD CONSTRAINT "consumer_resource_consumer_id_foreign" FOREIGN KEY ("consumer_id") REFERENCES "consumer"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consumer_resource" ADD CONSTRAINT "consumer_resource_resource_id_foreign" FOREIGN KEY ("resource_id") REFERENCES "resource"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contact" ADD CONSTRAINT "contact_consumer_id_foreign" FOREIGN KEY ("consumer_id") REFERENCES "consumer"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_method" ADD CONSTRAINT "payment_method_billing_details_id_foreign" FOREIGN KEY ("billing_details_id") REFERENCES "billing_details"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_method" ADD CONSTRAINT "payment_method_consumer_id_foreign" FOREIGN KEY ("consumer_id") REFERENCES "consumer"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_request" ADD CONSTRAINT "payment_request_payer_id_foreign" FOREIGN KEY ("payer_id") REFERENCES "consumer"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_request" ADD CONSTRAINT "payment_request_requester_id_foreign" FOREIGN KEY ("requester_id") REFERENCES "consumer"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_request_attachment" ADD CONSTRAINT "payment_request_attachment_payment_request_id_foreign" FOREIGN KEY ("payment_request_id") REFERENCES "payment_request"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_request_attachment" ADD CONSTRAINT "payment_request_attachment_requester_id_foreign" FOREIGN KEY ("requester_id") REFERENCES "consumer"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_request_attachment" ADD CONSTRAINT "payment_request_attachment_resource_id_foreign" FOREIGN KEY ("resource_id") REFERENCES "resource"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reset_password" ADD CONSTRAINT "reset_password_consumer_id_foreign" FOREIGN KEY ("consumer_id") REFERENCES "consumer"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_consumer_id_foreign" FOREIGN KEY ("consumer_id") REFERENCES "consumer"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_payment_request_id_foreign" FOREIGN KEY ("payment_request_id") REFERENCES "payment_request"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
