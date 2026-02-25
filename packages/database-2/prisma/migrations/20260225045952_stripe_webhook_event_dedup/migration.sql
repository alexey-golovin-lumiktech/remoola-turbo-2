-- CreateTable: fintech-safe at-most-once Stripe webhook processing by event id
CREATE TABLE "stripe_webhook_event" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stripe_webhook_event_pkey" PRIMARY KEY ("id")
);

-- Unique constraint for event-level deduplication
CREATE UNIQUE INDEX "stripe_webhook_event_event_id_key" ON "stripe_webhook_event"("event_id");
