-- Preferred rollout for non-empty environments:
-- create both indexes CONCURRENTLY as a predeploy step, then run this migration.
-- Prisma migrate deploy runs inside a transaction, so CI/ephemeral DBs need
-- a transactional fallback here.
CREATE INDEX IF NOT EXISTS "ledger_entry_type_status_idx"
  ON "ledger_entry" ("type", "status");

CREATE INDEX IF NOT EXISTS "ledger_entry_status_created_at_idx"
  ON "ledger_entry" ("status", "created_at");
