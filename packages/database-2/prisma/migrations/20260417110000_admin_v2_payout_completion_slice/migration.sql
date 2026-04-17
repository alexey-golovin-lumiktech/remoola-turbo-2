CREATE TABLE "payout_escalation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ledger_entry_id" UUID NOT NULL,
    "escalated_by" UUID NOT NULL,
    "reason" TEXT,
    "confirmed" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payout_escalation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "payout_escalation_ledger_entry_id_fkey"
      FOREIGN KEY ("ledger_entry_id") REFERENCES "ledger_entry"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "payout_escalation_escalated_by_fkey"
      FOREIGN KEY ("escalated_by") REFERENCES "admin"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX "payout_escalation_ledger_entry_id_key"
ON "payout_escalation"("ledger_entry_id");

CREATE INDEX "payout_escalation_escalated_by_created_at_idx"
ON "payout_escalation"("escalated_by", "created_at" DESC);

INSERT INTO "admin_permission" ("capability")
VALUES ('payouts.escalate')
ON CONFLICT ("capability") DO NOTHING;

INSERT INTO "admin_role_permission" ("role_id", "permission_id")
SELECT role_model."id", permission_model."id"
FROM "admin_role" AS role_model
JOIN "admin_permission" AS permission_model
  ON permission_model."capability" = 'payouts.escalate'
WHERE role_model."key" = 'SUPER_ADMIN'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
