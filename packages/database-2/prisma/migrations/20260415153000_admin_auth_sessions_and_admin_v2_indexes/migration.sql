CREATE TABLE "admin_auth_sessions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "admin_id" UUID NOT NULL,
  "session_family_id" UUID NOT NULL,
  "refresh_token_hash" TEXT NOT NULL,
  "access_token_hash" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "last_used_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revoked_at" TIMESTAMPTZ(6),
  "replaced_by_id" UUID,
  "invalidated_reason" TEXT,

  CONSTRAINT "admin_auth_sessions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "admin_auth_sessions"
ADD CONSTRAINT "admin_auth_sessions_admin_id_fkey"
FOREIGN KEY ("admin_id") REFERENCES "admin"("id")
ON DELETE CASCADE
ON UPDATE NO ACTION;

ALTER TABLE "admin_auth_sessions"
ADD CONSTRAINT "admin_auth_sessions_replaced_by_id_fkey"
FOREIGN KEY ("replaced_by_id") REFERENCES "admin_auth_sessions"("id")
ON DELETE SET NULL
ON UPDATE NO ACTION;

CREATE UNIQUE INDEX "admin_auth_sessions_refresh_token_hash_key"
ON "admin_auth_sessions"("refresh_token_hash");

CREATE INDEX "admin_auth_sessions_admin_id_revoked_at_idx"
ON "admin_auth_sessions"("admin_id", "revoked_at");

CREATE INDEX "admin_auth_sessions_session_family_id_revoked_at_idx"
ON "admin_auth_sessions"("session_family_id", "revoked_at");

CREATE INDEX "admin_auth_sessions_expires_at_idx"
ON "admin_auth_sessions"("expires_at");

CREATE INDEX "admin_auth_sessions_replaced_by_id_idx"
ON "admin_auth_sessions"("replaced_by_id");

CREATE INDEX "auth_audit_log_event_created_at_idx"
ON "auth_audit_log"("event", "created_at");

CREATE INDEX "admin_action_audit_log_resource_id_created_at_idx"
ON "admin_action_audit_log"("resource_id", "created_at");

CREATE INDEX "consumer_verification_status_deleted_at_idx"
ON "consumer"("verification_status", "deleted_at");

CREATE INDEX "consumer_created_at_idx"
ON "consumer"("created_at");
