-- Preserve existing expectation_date data before column removal.
CREATE TABLE IF NOT EXISTS "payment_request_expectation_date_archive" (
  "id" BIGSERIAL PRIMARY KEY,
  "payment_request_id" UUID NOT NULL,
  "expectation_date" TIMESTAMPTZ(6) NOT NULL,
  "archived_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "migration_tag" TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS "payment_request_expectation_date_archive_payment_request_id_idx"
  ON "payment_request_expectation_date_archive"("payment_request_id");

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payment_request'
      AND column_name = 'expectation_date'
  ) THEN
    INSERT INTO "payment_request_expectation_date_archive" (
      "payment_request_id",
      "expectation_date",
      "migration_tag"
    )
    SELECT
      pr."id",
      pr."expectation_date",
      '20260218130000_remove_expectation_date_with_archive'
    FROM "payment_request" pr
    WHERE pr."expectation_date" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM "payment_request_expectation_date_archive" a
        WHERE a."payment_request_id" = pr."id"
          AND a."expectation_date" = pr."expectation_date"
      );

    ALTER TABLE "payment_request" DROP COLUMN "expectation_date";
  END IF;
END
$$;
