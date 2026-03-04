-- Enable cascade delete: consumer -> ledger_entry -> ledger_entry_outcome/ledger_entry_dispute.
-- Allows deleting a consumer from Prisma Studio with all related records removed in one step.
-- ledger_entry_outcome and ledger_entry_dispute: RESTRICT -> CASCADE (so they are removed when ledger_entry is cascade-deleted).
-- consumer -> ledger_entry remains CASCADE (unchanged from original schema).
ALTER TABLE "ledger_entry_outcome" DROP CONSTRAINT "fk_ledger_entry_outcome_ledger_entry";
ALTER TABLE "ledger_entry_outcome" ADD CONSTRAINT "fk_ledger_entry_outcome_ledger_entry"
    FOREIGN KEY ("ledger_entry_id") REFERENCES "ledger_entry"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "ledger_entry_dispute" DROP CONSTRAINT "fk_ledger_entry_dispute_ledger_entry";
ALTER TABLE "ledger_entry_dispute" ADD CONSTRAINT "fk_ledger_entry_dispute_ledger_entry"
    FOREIGN KEY ("ledger_entry_id") REFERENCES "ledger_entry"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
