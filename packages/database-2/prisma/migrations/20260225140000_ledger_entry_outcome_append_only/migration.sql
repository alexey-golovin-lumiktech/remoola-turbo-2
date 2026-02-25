-- Append-only status transitions for ledger_entry (AGENTS 6.10: no UPDATE on financial history).
-- Application only INSERTs here; balance queries derive effective status via COALESCE(latest outcome.status, ledger_entry.status).
CREATE TABLE "ledger_entry_outcome" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ledger_entry_id" UUID NOT NULL,
    "status" "transaction_status_enum" NOT NULL,
    "source" TEXT,
    "external_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entry_outcome_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_ledger_entry_outcome_ledger_entry_id_created_at" ON "ledger_entry_outcome"("ledger_entry_id", "created_at" DESC);
CREATE INDEX "idx_ledger_entry_outcome_external_id" ON "ledger_entry_outcome"("external_id") WHERE "external_id" IS NOT NULL;

ALTER TABLE "ledger_entry_outcome" ADD CONSTRAINT "fk_ledger_entry_outcome_ledger_entry"
    FOREIGN KEY ("ledger_entry_id") REFERENCES "ledger_entry"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- Append-only dispute log (no UPDATE to ledger_entry.metadata).
CREATE TABLE "ledger_entry_dispute" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ledger_entry_id" UUID NOT NULL,
    "stripe_dispute_id" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entry_dispute_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_ledger_entry_dispute_ledger_entry_id" ON "ledger_entry_dispute"("ledger_entry_id");

ALTER TABLE "ledger_entry_dispute" ADD CONSTRAINT "fk_ledger_entry_dispute_ledger_entry"
    FOREIGN KEY ("ledger_entry_id") REFERENCES "ledger_entry"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
