CREATE TABLE "operational_assignment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "resource_type" TEXT NOT NULL,
    "resource_id" UUID NOT NULL,
    "assigned_to" UUID NOT NULL,
    "assigned_by" UUID,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_at" TIMESTAMPTZ(6),
    "released_by" UUID,
    "expires_at" TIMESTAMPTZ(6),
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operational_assignment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "operational_assignment_resource_type_check"
      CHECK ("resource_type" IN (
        'consumer',
        'verification',
        'payment_request',
        'ledger_entry',
        'payout',
        'fx_conversion',
        'document'
      )),
    CONSTRAINT "operational_assignment_release_actor_check"
      CHECK (("released_by" IS NULL) OR ("released_at" IS NOT NULL))
);

ALTER TABLE "operational_assignment"
ADD CONSTRAINT "operational_assignment_assigned_to_fkey"
FOREIGN KEY ("assigned_to") REFERENCES "admin"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "operational_assignment"
ADD CONSTRAINT "operational_assignment_assigned_by_fkey"
FOREIGN KEY ("assigned_by") REFERENCES "admin"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "operational_assignment"
ADD CONSTRAINT "operational_assignment_released_by_fkey"
FOREIGN KEY ("released_by") REFERENCES "admin"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

CREATE INDEX "operational_assignment_resource_type_resource_id_released_at_idx"
ON "operational_assignment"("resource_type", "resource_id", "released_at");

CREATE INDEX "operational_assignment_assigned_to_released_at_idx"
ON "operational_assignment"("assigned_to", "released_at");

CREATE UNIQUE INDEX "idx_operational_assignment_active_resource"
ON "operational_assignment"("resource_type", "resource_id")
WHERE "released_at" IS NULL;
