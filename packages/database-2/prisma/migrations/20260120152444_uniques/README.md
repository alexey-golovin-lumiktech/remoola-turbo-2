# Uniques: soft-delete aware unique constraints

Replaces non–soft-delete uniques with (key columns, deleted_at) so the same business key can reappear after soft delete.

**Reference:** postgresql-design-rules (soft delete, partial indexes);

## What this migration does

- Drops old unique indexes (e.g. admin_email_key, consumer_email_key, payment_method billing/stripe uniques) and creates new uniques including deleted_at (e.g. address_details_consumerId_deleted_at_key, admin_email_deleted_at_key).
- Alters access_refresh_token and payment_method column types (e.g. tokens to TEXT); makes payment_method.billing_details_id nullable.

## Deploy order

1. **Resolve duplicate (key, deleted_at)** pairs if any (migration can fail).
2. **Run this migration** (e.g. `npx prisma migrate deploy`).
3. **Deploy the application** that uses soft-delete–aware uniques.

## Rollback

Drop new uniques and recreate old ones. Ensure no duplicate keys exist for the old uniques (e.g. duplicate email where deleted_at IS NULL). Data in altered columns may need casting back.
