# Initial schema (Knex baseline)

Creates the original database schema: enums, core tables (consumer, admin, payment_request, transaction, resource, contact, exchange_rate, etc.), and Knex migration tables. Uses `uuid-ossp` for UUID generation.

**Reference:** Initial schema; no external reference. Later migrations replace `transaction` with `ledger_entry` and drop Knex tables.

## What this migration does

- Creates enum types (account_type, admin_type, currency_code, transaction_status, etc.).
- Creates tables: access_refresh_token, address_details, admin, billing_details, consumer, consumer_resource, contact, exchange_rate, google_profile_details, organization_details, payment_method, payment_request, payment_request_attachment, personal_details, reset_password, resource, transaction, knex_migrations, knex_migrations_lock.
- Defines primary keys, foreign keys, and initial indexes.

## Deploy order

1. **Run this migration** first in a fresh database (e.g. `npx prisma migrate deploy`).
2. No application deploy dependency; this is the baseline.

## Rollback

Full schema drop is equivalent to dropping the database. To undo only this migration in a linear history, restore from backup or recreate the database and run no migrations.