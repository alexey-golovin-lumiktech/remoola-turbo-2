# Ledger entry outcome/dispute: RESTRICT → CASCADE

## Why

Enables cascade delete when removing a consumer (e.g. from Prisma Studio): deleting the consumer cascades to `ledger_entry` → `ledger_entry_outcome` and `ledger_entry_dispute`, so all related records are removed in one step.

Previously `ledger_entry_outcome` and `ledger_entry_dispute` had `ON DELETE RESTRICT`, which blocked the cascade chain when deleting a consumer with ledger history.

## What this migration does

- Drops `fk_ledger_entry_outcome_ledger_entry` and re-adds with `ON DELETE CASCADE`.
- Drops `fk_ledger_entry_dispute_ledger_entry` and re-adds with `ON DELETE CASCADE`.
- `consumer -> ledger_entry` remains `ON DELETE CASCADE` (unchanged).

## Trade-off

⚠️ **Fintech note:** Hard-deleting a consumer now permanently removes their ledger entries and audit trail. For production consumers with financial history, prefer soft-delete (`consumer.deleted_at`) to preserve auditability. Cascade delete is intended for dev/staging cleanup and test data removal.

## Safeguards

- **Dev/staging:** To hard-delete a consumer (and have cascade remove related `ledger_entry`, `ledger_entry_outcome`, `ledger_entry_dispute`), use Prisma Studio or direct SQL; no application script required.
- **Production:** Use soft-delete only (`consumer.deleted_at`) for consumers with financial history. Restrict production DB and Prisma Studio access; use read-only replicas where possible.

## Rollback

To restore `ON DELETE RESTRICT` on both child FKs (e.g. for ops runbooks or reverting to pre-migration behavior), run the following SQL. **Note:** This does not undo any deletes already performed under CASCADE; those rows are permanently removed.

```sql
ALTER TABLE "ledger_entry_outcome" DROP CONSTRAINT "fk_ledger_entry_outcome_ledger_entry";
ALTER TABLE "ledger_entry_outcome" ADD CONSTRAINT "fk_ledger_entry_outcome_ledger_entry"
    FOREIGN KEY ("ledger_entry_id") REFERENCES "ledger_entry"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "ledger_entry_dispute" DROP CONSTRAINT "fk_ledger_entry_dispute_ledger_entry";
ALTER TABLE "ledger_entry_dispute" ADD CONSTRAINT "fk_ledger_entry_dispute_ledger_entry"
    FOREIGN KEY ("ledger_entry_id") REFERENCES "ledger_entry"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
```
