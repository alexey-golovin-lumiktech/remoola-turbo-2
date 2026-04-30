CREATE INDEX IF NOT EXISTS "idx_payment_request_payer_id_deleted_at_created_at"
ON "payment_request" ("payer_id", "deleted_at", "created_at" DESC, "id" DESC);

CREATE INDEX IF NOT EXISTS "idx_payment_request_requester_id_deleted_at_created_at"
ON "payment_request" ("requester_id", "deleted_at", "created_at" DESC, "id" DESC);

CREATE INDEX IF NOT EXISTS "idx_payment_request_payer_email_active_lower_created_at"
ON "payment_request" (LOWER(COALESCE("payer_email", '')), "created_at" DESC, "id" DESC)
WHERE "deleted_at" IS NULL AND "payer_id" IS NULL;

CREATE INDEX IF NOT EXISTS "idx_payment_request_requester_email_active_lower_created_at"
ON "payment_request" (LOWER(COALESCE("requester_email", '')), "created_at" DESC, "id" DESC)
WHERE "deleted_at" IS NULL AND "requester_id" IS NULL;
