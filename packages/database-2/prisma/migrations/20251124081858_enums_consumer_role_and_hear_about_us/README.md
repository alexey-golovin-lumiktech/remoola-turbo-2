# Enums: consumer_role and how_did_hear_about_us

Adds enums and columns for organization consumer role and how the user heard about the product.

**Reference:** Product/schema requirements; no AGENTS/postgresql-design-rules reference.

## What this migration does

- Creates enum consumer_role (FOUNDER, FINANCE, MARKETING, etc.) and how_did_hear_about_us (EMPLOYER_COMPANY, REFERRED_RECOMMENDED, etc.).
- Adds organization_details.consumer_role (enum) and consumer_role_other (VARCHAR).
- Adds consumer.how_did_hear_about_us (enum) and how_did_hear_about_us_other; drops previous column if different type.

## Deploy order

1. **Run this migration** (e.g. `npx prisma migrate deploy`).
2. **Deploy the application** that uses consumer_role and how_did_hear_about_us.

## Rollback

Drop new columns and enums; restore previous column types if any. Map existing enum values back if rolling back application too; prefer fixing forward.