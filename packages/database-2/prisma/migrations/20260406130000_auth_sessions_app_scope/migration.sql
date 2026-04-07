ALTER TABLE "auth_sessions"
ADD COLUMN "app_scope" TEXT;

UPDATE "auth_sessions"
SET "app_scope" = '__legacy_invalidated__'
WHERE "app_scope" IS NULL;

ALTER TABLE "auth_sessions"
ALTER COLUMN "app_scope" SET NOT NULL;

CREATE INDEX "auth_sessions_consumer_id_app_scope_revoked_at_idx"
ON "auth_sessions"("consumer_id", "app_scope", "revoked_at");
