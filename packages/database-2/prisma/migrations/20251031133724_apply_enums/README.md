# Apply enums to table columns

Wires enum types to table columns across admin, consumer, organization_details, payment_request, personal_details, payment_method, transaction, and exchange_rate. Creates `transaction_fees_type_enum`.

**Reference:** postgresql-design-rules (enum/CHECK usage); no specific rule number.

## What this migration does

- Drops and re-adds columns as enum-typed: admin.type, consumer.account_type/contractor_kind, organization_details.size, payment_request.currency_code/status/type, personal_details.legal_status, payment_method.type, transaction type/currency_code/action_type/status/fees_type, exchange_rate from_currency/to_currency.
- Creates unique indexes: exchange_rate (from_currency, to_currency), payment_method (type, last4, consumer_id).

## Deploy order

1. **Run this migration** (e.g. `npx prisma migrate deploy`). Fails if columns have data that cannot be cast to new enum values.
2. **Deploy the application** that uses these enums.

## Rollback

Revert columns to previous types and restore old enums. Data in new enum form must be mapped back; prefer fixing forward to avoid data loss.