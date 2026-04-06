ALTER TABLE "reset_password"
ADD COLUMN IF NOT EXISTS "app_scope" TEXT;

UPDATE "reset_password"
SET "app_scope" = 'consumer'
WHERE "app_scope" IS NULL;

ALTER TABLE "reset_password"
ALTER COLUMN "app_scope" SET DEFAULT 'consumer';
