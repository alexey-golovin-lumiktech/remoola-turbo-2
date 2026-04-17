ALTER TABLE "payment_method"
ADD COLUMN "disabled_by" UUID,
ADD COLUMN "disabled_at" TIMESTAMPTZ(6);

ALTER TABLE "payment_method"
ADD CONSTRAINT "payment_method_disabled_by_fkey"
FOREIGN KEY ("disabled_by") REFERENCES "admin"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

CREATE INDEX "payment_method_disabled_at_idx" ON "payment_method"("disabled_at");

CREATE TABLE "payment_method_duplicate_escalation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payment_method_id" UUID NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "duplicate_count" INTEGER NOT NULL,
    "duplicate_payment_method_ids" JSONB NOT NULL,
    "escalated_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_method_duplicate_escalation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "payment_method_duplicate_escalation_payment_method_id_fkey"
      FOREIGN KEY ("payment_method_id") REFERENCES "payment_method"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "payment_method_duplicate_escalation_escalated_by_fkey"
      FOREIGN KEY ("escalated_by") REFERENCES "admin"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX "payment_method_duplicate_escalation_payment_method_id_fingerprint_key"
ON "payment_method_duplicate_escalation"("payment_method_id", "fingerprint");

CREATE INDEX "payment_method_duplicate_escalation_fingerprint_created_at_idx"
ON "payment_method_duplicate_escalation"("fingerprint", "created_at" DESC);

CREATE INDEX "payment_method_duplicate_escalation_escalated_by_created_at_idx"
ON "payment_method_duplicate_escalation"("escalated_by", "created_at" DESC);

INSERT INTO "admin_permission" ("capability")
VALUES ('payment_methods.manage')
ON CONFLICT ("capability") DO NOTHING;

INSERT INTO "admin_role_permission" ("role_id", "permission_id")
SELECT role_model."id", permission_model."id"
FROM "admin_role" AS role_model
JOIN "admin_permission" AS permission_model
  ON permission_model."capability" = 'payment_methods.manage'
WHERE role_model."key" = 'SUPER_ADMIN'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
