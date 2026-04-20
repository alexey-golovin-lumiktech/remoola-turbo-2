-- Adds an index on ledger_entry_outcome whose key shape exactly matches the
-- LATERAL pattern used by AdminV2LedgerAnomaliesService:
--   ORDER BY o.created_at DESC, o.id DESC LIMIT 1
-- and that includes `status` so the LATERAL becomes an index-only scan
-- (no heap fetch for the columns we project: status + created_at).
--
-- See README.md in this folder for the BEFORE/AFTER measurements that drove
-- the choice of one composite covering index over a second partial index.
--
-- Additive-only: we do NOT drop the existing
-- `idx_ledger_entry_outcome_ledger_entry_id_created_at` from migration
-- 20260225140000_ledger_entry_outcome_append_only. That drop is owned by a
-- future cleanup once we have a measurement window that confirms the planner
-- has fully migrated to the new index.
CREATE INDEX IF NOT EXISTS "idx_ledger_entry_outcome_lateral_covering"
  ON "ledger_entry_outcome" ("ledger_entry_id", "created_at" DESC, "id" DESC)
  INCLUDE ("status");
