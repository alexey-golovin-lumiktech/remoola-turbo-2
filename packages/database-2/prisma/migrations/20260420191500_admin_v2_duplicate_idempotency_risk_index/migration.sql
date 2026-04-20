-- Additive-only future-proofing index for the duplicateIdempotencyRisk slice.
-- This shape targets the narrow partial predicate:
--   deleted_at IS NULL
--   AND idempotency_key IS NULL
--   AND stripe_id IS NOT NULL
-- while keeping created_at/id ordering aligned with the queue cursor.
--
-- On the post-migration 50k synthetic dataset the planner already switches
-- the duplicate-risk count/list probes to this index. The migration is still
-- justified primarily as future-proofing: the probes were already fast, but we
-- do not want production growth to re-open this shape as an urgent schema
-- change later.
CREATE INDEX IF NOT EXISTS "idx_ledger_entry_duplicate_idempotency_risk"
  ON "ledger_entry" ("created_at" DESC, "id" DESC)
  WHERE "deleted_at" IS NULL
    AND "idempotency_key" IS NULL
    AND "stripe_id" IS NOT NULL;
