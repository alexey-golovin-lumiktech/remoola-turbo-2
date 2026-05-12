-- Add durable side-effect queue for notifications that must survive post-commit failures.
-- Additive-only: no existing data is changed and no historical notification backfill is attempted.
CREATE TABLE "notification_outbox" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "event_type" TEXT NOT NULL,
  "aggregate_type" TEXT NOT NULL,
  "aggregate_id" UUID NOT NULL,
  "idempotency_key" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "next_attempt_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processing_started_at" TIMESTAMPTZ(6),
  "claim_token" TEXT,
  "sent_at" TIMESTAMPTZ(6),
  "failed_at" TIMESTAMPTZ(6),
  "last_error_class" TEXT,
  "last_error_message" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "notification_outbox_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notification_outbox_status_check" CHECK ("status" IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'DEAD'))
);

CREATE UNIQUE INDEX "notification_outbox_idempotency_key_key"
  ON "notification_outbox"("idempotency_key");

CREATE INDEX "notification_outbox_status_next_attempt_at_created_at_idx"
  ON "notification_outbox"("status", "next_attempt_at", "created_at");

CREATE INDEX "notification_outbox_aggregate_type_aggregate_id_idx"
  ON "notification_outbox"("aggregate_type", "aggregate_id");
