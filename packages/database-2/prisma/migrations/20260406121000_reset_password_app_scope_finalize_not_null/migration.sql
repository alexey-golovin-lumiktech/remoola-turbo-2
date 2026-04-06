UPDATE "reset_password"
SET "app_scope" = 'consumer'
WHERE "app_scope" IS NULL;

ALTER TABLE "reset_password"
ALTER COLUMN "app_scope" SET NOT NULL;

ALTER TABLE "reset_password"
ALTER COLUMN "app_scope" DROP DEFAULT;
