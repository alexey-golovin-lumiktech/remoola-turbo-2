# Payment request: add payment_rail enum and column

Records how a payment is routed (internal, SEPA, card, Stripe, etc.).

**Reference:** Product/payment routing; no AGENTS/postgresql-design-rules reference.

## What this migration does

- Creates enum payment_rail_enum (INTERNAL, BANK_TRANSFER, SEPA_TRANSFER, CARD, STRIPE_*, etc.).
- Adds nullable column payment_request.payment_rail (payment_rail_enum).

## Deploy order

1. **Run this migration** (e.g. `npx prisma migrate deploy`).
2. **Deploy the application** that sets/reads payment_rail. Additive; no breaking change.

## Rollback

Alter table payment_request DROP COLUMN payment_rail; drop type payment_rail_enum. Column data is lost; low risk if column was optional.