-- Cleanup: drop legacy token column and index after additive migration and deploy.
-- Run after 20260317120000_reset_password_token_hash and app using token_hash only.

DROP INDEX IF EXISTS "reset_password_token_idx";

ALTER TABLE "reset_password"
  DROP COLUMN "token";
