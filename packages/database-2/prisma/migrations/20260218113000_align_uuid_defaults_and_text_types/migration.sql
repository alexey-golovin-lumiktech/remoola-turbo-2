-- Align schema-level UUID defaults and String @db.Text changes with database state.
-- This migration is intentionally explicit to avoid runtime drift between Prisma schema and deployed DB.

-- Ensure gen_random_uuid() is available.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Align PK defaults to DB-side UUID generation via pgcrypto.
ALTER TABLE "access_refresh_token" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "address_details" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "admin" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "billing_details" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "consumer" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "consumer_resource" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "contact" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "exchange_rate" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "wallet_auto_conversion_rule" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "scheduled_fx_conversion" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "google_profile_details" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "organization_details" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "payment_method" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "payment_request" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "ledger_entry" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "payment_request_attachment" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "personal_details" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "reset_password" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "resource" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "document_tag" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "resource_tag" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "user_settings" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- Align String columns to TEXT as required by schema and repo DB standards.
ALTER TABLE "address_details"
  ALTER COLUMN "postal_code" TYPE TEXT,
  ALTER COLUMN "country" TYPE TEXT,
  ALTER COLUMN "city" TYPE TEXT,
  ALTER COLUMN "state" TYPE TEXT,
  ALTER COLUMN "street" TYPE TEXT;

ALTER TABLE "admin"
  ALTER COLUMN "email" TYPE TEXT,
  ALTER COLUMN "password" TYPE TEXT,
  ALTER COLUMN "salt" TYPE TEXT;

ALTER TABLE "billing_details"
  ALTER COLUMN "email" TYPE TEXT,
  ALTER COLUMN "name" TYPE TEXT,
  ALTER COLUMN "phone" TYPE TEXT;

ALTER TABLE "consumer"
  ALTER COLUMN "email" TYPE TEXT,
  ALTER COLUMN "password" TYPE TEXT,
  ALTER COLUMN "salt" TYPE TEXT,
  ALTER COLUMN "how_did_hear_about_us_other" TYPE TEXT,
  ALTER COLUMN "stripe_customer_id" TYPE TEXT;

ALTER TABLE "contact"
  ALTER COLUMN "email" TYPE TEXT,
  ALTER COLUMN "name" TYPE TEXT;

ALTER TABLE "exchange_rate"
  ALTER COLUMN "provider" TYPE TEXT,
  ALTER COLUMN "provider_rate_id" TYPE TEXT;

ALTER TABLE "scheduled_fx_conversion"
  ALTER COLUMN "last_error" TYPE TEXT;

ALTER TABLE "google_profile_details"
  ALTER COLUMN "email" TYPE TEXT,
  ALTER COLUMN "name" TYPE TEXT,
  ALTER COLUMN "given_name" TYPE TEXT,
  ALTER COLUMN "family_name" TYPE TEXT,
  ALTER COLUMN "picture" TYPE TEXT,
  ALTER COLUMN "organization" TYPE TEXT;

ALTER TABLE "organization_details"
  ALTER COLUMN "name" TYPE TEXT,
  ALTER COLUMN "consumer_role_other" TYPE TEXT;

ALTER TABLE "payment_method"
  ALTER COLUMN "stripe_payment_method_id" TYPE TEXT,
  ALTER COLUMN "stripe_fingerprint" TYPE TEXT,
  ALTER COLUMN "brand" TYPE TEXT,
  ALTER COLUMN "last4" TYPE TEXT,
  ALTER COLUMN "exp_month" TYPE TEXT,
  ALTER COLUMN "exp_year" TYPE TEXT,
  ALTER COLUMN "bank_name" TYPE TEXT,
  ALTER COLUMN "bank_last4" TYPE TEXT,
  ALTER COLUMN "bank_country" TYPE TEXT;

ALTER TABLE "payment_request"
  ALTER COLUMN "description" TYPE TEXT,
  ALTER COLUMN "created_by" TYPE TEXT,
  ALTER COLUMN "updated_by" TYPE TEXT,
  ALTER COLUMN "deleted_by" TYPE TEXT;

ALTER TABLE "ledger_entry"
  ALTER COLUMN "stripe_id" TYPE TEXT,
  ALTER COLUMN "idempotency_key" TYPE TEXT,
  ALTER COLUMN "created_by" TYPE TEXT,
  ALTER COLUMN "updated_by" TYPE TEXT,
  ALTER COLUMN "deleted_by" TYPE TEXT;

ALTER TABLE "personal_details"
  ALTER COLUMN "citizen_of" TYPE TEXT,
  ALTER COLUMN "passport_or_id_number" TYPE TEXT,
  ALTER COLUMN "country_of_tax_residence" TYPE TEXT,
  ALTER COLUMN "tax_id" TYPE TEXT,
  ALTER COLUMN "phone_number" TYPE TEXT,
  ALTER COLUMN "first_name" TYPE TEXT,
  ALTER COLUMN "last_name" TYPE TEXT;

ALTER TABLE "reset_password"
  ALTER COLUMN "token" TYPE TEXT;

ALTER TABLE "resource"
  ALTER COLUMN "originalname" TYPE TEXT,
  ALTER COLUMN "mimetype" TYPE TEXT,
  ALTER COLUMN "bucket" TYPE TEXT,
  ALTER COLUMN "key" TYPE TEXT,
  ALTER COLUMN "download_url" TYPE TEXT;

ALTER TABLE "document_tag"
  ALTER COLUMN "name" TYPE TEXT;

-- Ensure FK index expected by schema and query plans.
CREATE INDEX IF NOT EXISTS "idx_payment_method_billing_details_id"
  ON "payment_method"("billing_details_id");
