-- Accelerates consumer payment list/history queries that repeatedly fetch the
-- latest active ledger row for a payment request or a consumer ledger.

CREATE INDEX IF NOT EXISTS "idx_ledger_entry_payment_request_consumer_latest"
  ON "ledger_entry" ("payment_request_id", "consumer_id", "created_at" DESC, "id" DESC)
  INCLUDE ("status")
  WHERE "deleted_at" IS NULL
    AND "payment_request_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_ledger_entry_consumer_ledger_latest"
  ON "ledger_entry" ("consumer_id", "ledger_id", "created_at" DESC, "id" DESC)
  WHERE "deleted_at" IS NULL;
