-- CreateTable
CREATE TABLE "admin_action_audit_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "admin_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resource_id" TEXT,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_action_audit_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_action_audit_log_admin_id_created_at_idx" ON "admin_action_audit_log"("admin_id", "created_at");
CREATE INDEX "admin_action_audit_log_action_created_at_idx" ON "admin_action_audit_log"("action", "created_at");
CREATE INDEX "admin_action_audit_log_resource_created_at_idx" ON "admin_action_audit_log"("resource", "created_at");
