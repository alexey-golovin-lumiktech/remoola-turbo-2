CREATE TABLE "admin_action_idempotency" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "admin_id" UUID NOT NULL,
  "scope" TEXT NOT NULL,
  "idempotency_key" TEXT NOT NULL,
  "request_hash" TEXT NOT NULL,
  "response_status" INTEGER NOT NULL,
  "response_snapshot" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "admin_action_idempotency_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "admin_action_idempotency"
ADD CONSTRAINT "admin_action_idempotency_admin_id_fkey"
FOREIGN KEY ("admin_id") REFERENCES "admin"("id")
ON DELETE CASCADE
ON UPDATE NO ACTION;

CREATE UNIQUE INDEX "admin_action_idempotency_admin_id_scope_idempotency_key_key"
ON "admin_action_idempotency"("admin_id", "scope", "idempotency_key");

CREATE INDEX "admin_action_idempotency_expires_at_idx"
ON "admin_action_idempotency"("expires_at");
