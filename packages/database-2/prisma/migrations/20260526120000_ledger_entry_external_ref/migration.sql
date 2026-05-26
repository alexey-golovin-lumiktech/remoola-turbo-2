-- Append-only late-binding of external-system identifiers (e.g. Stripe refund id)
-- onto an existing ledger_entry. Replaces application-level UPDATE on
-- ledger_entry.stripe_id from the admin refund finalizer path.

CREATE TABLE "ledger_entry_external_ref" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ledger_entry_id" UUID NOT NULL,
    "source" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entry_external_ref_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ledger_entry_external_ref_ledger_entry_id_source_key"
    ON "ledger_entry_external_ref" ("ledger_entry_id", "source");

CREATE INDEX "ledger_entry_external_ref_source_external_id_idx"
    ON "ledger_entry_external_ref" ("source", "external_id");

ALTER TABLE "ledger_entry_external_ref"
    ADD CONSTRAINT "ledger_entry_external_ref_ledger_entry_id_fkey"
    FOREIGN KEY ("ledger_entry_id") REFERENCES "ledger_entry" ("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;
