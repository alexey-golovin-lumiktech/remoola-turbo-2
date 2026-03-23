-- Ensure at most one outcome per (ledger_entry_id, external_id) when external_id is set.
-- Enables idempotent outcome creation for webhooks/scheduler (see docs/FINANCIAL_SAFETY_AND_DB_COMPLIANCE.md).
CREATE UNIQUE INDEX "idx_ledger_entry_outcome_ledger_entry_external"
  ON "ledger_entry_outcome" ("ledger_entry_id", "external_id")
  WHERE "external_id" IS NOT NULL;
