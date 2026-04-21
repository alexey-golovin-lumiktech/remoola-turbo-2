CREATE TABLE "operational_alert" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "workspace" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "query_payload" JSONB NOT NULL,
    "threshold_payload" JSONB NOT NULL,
    "evaluation_interval_minutes" INTEGER NOT NULL DEFAULT 5,
    "last_evaluated_at" TIMESTAMPTZ(6),
    "last_evaluation_error" TEXT,
    "last_fired_at" TIMESTAMPTZ(6),
    "last_fire_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "operational_alert_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "operational_alert_workspace_check"
      CHECK ("workspace" IN (
        'ledger_anomalies'
      )),
    CONSTRAINT "operational_alert_name_length_check"
      CHECK (char_length("name") BETWEEN 1 AND 100),
    CONSTRAINT "operational_alert_description_length_check"
      CHECK ("description" IS NULL OR char_length("description") <= 500),
    CONSTRAINT "operational_alert_query_payload_size_check"
      CHECK (octet_length("query_payload"::text) <= 4096),
    CONSTRAINT "operational_alert_threshold_payload_size_check"
      CHECK (octet_length("threshold_payload"::text) <= 1024),
    CONSTRAINT "operational_alert_evaluation_interval_check"
      CHECK ("evaluation_interval_minutes" BETWEEN 1 AND 1440),
    CONSTRAINT "operational_alert_last_fire_reason_length_check"
      CHECK ("last_fire_reason" IS NULL OR char_length("last_fire_reason") <= 500),
    CONSTRAINT "operational_alert_last_evaluation_error_length_check"
      CHECK ("last_evaluation_error" IS NULL OR char_length("last_evaluation_error") <= 500)
);

ALTER TABLE "operational_alert"
ADD CONSTRAINT "operational_alert_owner_id_fkey"
FOREIGN KEY ("owner_id") REFERENCES "admin"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE INDEX "operational_alert_owner_id_workspace_deleted_at_idx"
ON "operational_alert"("owner_id", "workspace", "deleted_at");

CREATE INDEX "operational_alert_deleted_at_last_evaluated_at_idx"
ON "operational_alert"("deleted_at", "last_evaluated_at");

CREATE UNIQUE INDEX "idx_operational_alert_active_owner_workspace_name"
ON "operational_alert"("owner_id", "workspace", "name")
WHERE "deleted_at" IS NULL;
