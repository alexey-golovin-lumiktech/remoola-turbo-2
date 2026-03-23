ALTER TABLE "consumer"
ADD COLUMN "stripe_identity_status" TEXT,
ADD COLUMN "stripe_identity_session_id" TEXT,
ADD COLUMN "stripe_identity_last_error_code" TEXT,
ADD COLUMN "stripe_identity_last_error_reason" TEXT,
ADD COLUMN "stripe_identity_started_at" TIMESTAMPTZ(6),
ADD COLUMN "stripe_identity_updated_at" TIMESTAMPTZ(6),
ADD COLUMN "stripe_identity_verified_at" TIMESTAMPTZ(6);

ALTER TABLE "consumer"
ADD CONSTRAINT "consumer_stripe_identity_status_check"
CHECK (
  "stripe_identity_status" IS NULL
  OR "stripe_identity_status" IN (
    'pending_submission',
    'requires_input',
    'verified',
    'canceled',
    'redacted'
  )
);
