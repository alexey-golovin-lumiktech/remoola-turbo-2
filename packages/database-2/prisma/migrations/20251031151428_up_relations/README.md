# Consumer relations: detail tables own consumerId

Restructures consumer ↔ detail tables: detail tables hold `consumerId` instead of consumer holding detail IDs. One-to-one per consumer for address, google_profile, organization, personal details.

**Reference:** Schema normalization; no AGENTS/postgresql-design-rules reference.

## What this migration does

- Drops from consumer: address_details_id, google_profile_details_id, organization_details_id, personal_details_id.
- Adds to address_details, google_profile_details, organization_details, personal_details: required `consumerId` (UUID), with unique and FK to consumer.
- Drops and re-adds FKs for consumer_resource, contact, payment_method, payment_request, payment_request_attachment, reset_password, transaction.

## Deploy order

1. **Backfill** consumerId on detail tables if they already have data (migration adds NOT NULL without default).
2. **Run this migration** (e.g. `npx prisma migrate deploy`).
3. **Deploy the application** that uses the new relation direction.

## Rollback

Re-add detail IDs to consumer, drop consumerId from detail tables, and restore previous FKs. Requires backfill of consumer columns from detail rows; prefer fixing forward.