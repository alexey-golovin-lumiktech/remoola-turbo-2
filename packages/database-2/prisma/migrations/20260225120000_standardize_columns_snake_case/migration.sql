-- Safe unification: rename camelCase columns to snake_case. No data loss (RENAME COLUMN only).
-- Deploy order: 1) Run this migration, 2) Deploy app with updated schema + raw SQL.

-- address_details
ALTER TABLE "address_details" RENAME COLUMN "consumerId" TO "consumer_id";

-- google_profile_details
ALTER TABLE "google_profile_details" RENAME COLUMN "consumerId" TO "consumer_id";

-- organization_details
ALTER TABLE "organization_details" RENAME COLUMN "consumerId" TO "consumer_id";

-- personal_details
ALTER TABLE "personal_details" RENAME COLUMN "consumerId" TO "consumer_id";

-- consumer_settings (ex user_settings)
ALTER TABLE "consumer_settings" RENAME COLUMN "consumerId" TO "consumer_id";

-- admin_settings
ALTER TABLE "admin_settings" RENAME COLUMN "adminId" TO "admin_id";

-- ledger_entry (fintech-critical: used in raw balance queries)
ALTER TABLE "ledger_entry" RENAME COLUMN "currencyCode" TO "currency_code";
ALTER TABLE "ledger_entry" RENAME COLUMN "feesType" TO "fees_type";
ALTER TABLE "ledger_entry" RENAME COLUMN "feesAmount" TO "fees_amount";

-- resource: originalname → original_name (snake_case)
ALTER TABLE "resource" RENAME COLUMN "originalname" TO "original_name";
