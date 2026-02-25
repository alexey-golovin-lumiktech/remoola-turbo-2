# Standardize columns to snake_case

This migration renames camelCase columns to snake_case for schema consistency. **No data is deleted**; only `ALTER TABLE ... RENAME COLUMN` is used.

**Reference:** postgresql-design-rules.md Rule 26.

## What this migration does

- Renames columns on multiple tables to snake_case. Key renames:
  - **address_details, google_profile_details, organization_details, personal_details, consumer_settings:** `consumerId` → `consumer_id`
  - **admin_settings:** `adminId` → `admin_id`
  - **ledger_entry:** `currencyCode` → `currency_code`, `feesType` → `fees_type`, `feesAmount` → `fees_amount`
  - **resource:** `originalname` → `original_name`

## Deploy order

1. **Run this migration** (e.g. `npx prisma migrate deploy`).
2. **Deploy the application** that includes the updated schema (`@map`) and raw SQL (e.g. `currency_code` in ledger balance queries).

Run the migration **before** or in the **same release** as the app deploy. After the migration, the old app would look for columns like `"currencyCode"` that no longer exist. Plan a short maintenance window: run migration, then deploy new app.

## Rollback

Reverse renames (e.g. `RENAME COLUMN "consumer_id" TO "consumerId"`) only after deploying an app that uses the old column names again. Prefer fixing forward; rollback causes downtime if the new app is already live.
