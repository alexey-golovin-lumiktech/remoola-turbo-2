-- Add token_hash column and backfill from plaintext token (SHA-256 hex).
-- Additive-first: do not drop token here; cleanup in a later migration.
-- pgcrypto is already enabled (align_uuid_defaults_and_text_types).

ALTER TABLE "reset_password"
  ADD COLUMN "token_hash" TEXT;

UPDATE "reset_password"
  SET "token_hash" = encode(digest("token", 'sha256'), 'hex')
  WHERE "token" IS NOT NULL;

ALTER TABLE "reset_password"
  ALTER COLUMN "token_hash" SET NOT NULL;

CREATE INDEX "reset_password_token_hash_idx" ON "reset_password"("token_hash");
