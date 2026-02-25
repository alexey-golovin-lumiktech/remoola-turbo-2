# Payment method: Stripe payment method id and unique constraint

Links payment methods to Stripe and prevents the same Stripe payment method from being linked twice per consumer.

**Reference:** Idempotency/uniqueness; postgresql-design-rules (unique constraints).

## What this migration does

- Adds nullable column payment_method.stripe_payment_method_id (TEXT).
- Creates index payment_method_consumer_id_idx and unique index on (consumer_id, stripe_payment_method_id).

## Deploy order

1. **Resolve duplicates** for (consumer_id, stripe_payment_method_id) if any (migration fails otherwise).
2. **Run this migration** (e.g. `npx prisma migrate deploy`).
3. **Deploy the application** that sets/reads stripe_payment_method_id.

## Rollback

Drop the two indexes and alter table DROP COLUMN stripe_payment_method_id. Column data is lost; low risk if additive.