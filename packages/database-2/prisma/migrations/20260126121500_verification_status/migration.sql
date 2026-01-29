-- Add verification status tracking for consumers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status_enum') THEN
    CREATE TYPE verification_status_enum AS ENUM ('PENDING', 'APPROVED', 'MORE_INFO', 'REJECTED', 'FLAGGED');
  END IF;
END$$;

ALTER TABLE "consumer"
  ADD COLUMN IF NOT EXISTS "verification_status" verification_status_enum NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "verification_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "verification_updated_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "verification_updated_by" UUID;
