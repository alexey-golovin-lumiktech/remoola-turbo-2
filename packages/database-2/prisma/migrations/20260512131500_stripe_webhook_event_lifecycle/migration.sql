-- Add status lifecycle metadata for Stripe webhook event claims.
-- Existing rows were already accepted as processed dedupe markers.
ALTER TABLE "stripe_webhook_event"
  ADD COLUMN "event_type" TEXT,
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PROCESSED',
  ADD COLUMN "claim_token" TEXT,
  ADD COLUMN "processing_started_at" TIMESTAMPTZ(6),
  ADD COLUMN "processed_at" TIMESTAMPTZ(6),
  ADD COLUMN "failed_at" TIMESTAMPTZ(6),
  ADD COLUMN "attempt_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "last_error_class" TEXT,
  ADD COLUMN "last_error_message" TEXT;

UPDATE "stripe_webhook_event"
SET
  "status" = 'PROCESSED',
  "processed_at" = COALESCE("processed_at", "created_at"),
  "attempt_count" = CASE WHEN "attempt_count" = 0 THEN 1 ELSE "attempt_count" END;

ALTER TABLE "stripe_webhook_event"
  ADD CONSTRAINT "stripe_webhook_event_status_check"
  CHECK ("status" IN ('PROCESSING', 'PROCESSED', 'FAILED'));

CREATE INDEX "stripe_webhook_event_status_processing_started_at_idx"
  ON "stripe_webhook_event"("status", "processing_started_at");
