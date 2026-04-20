CREATE INDEX CONCURRENTLY IF NOT EXISTS "ledger_entry_type_status_idx"
  ON "ledger_entry" ("type", "status");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "ledger_entry_status_created_at_idx"
  ON "ledger_entry" ("status", "created_at");
