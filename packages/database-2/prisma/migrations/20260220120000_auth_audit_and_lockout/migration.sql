-- CreateTable
CREATE TABLE "auth_audit_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "identity_type" TEXT NOT NULL,
    "identity_id" UUID,
    "email" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "auth_audit_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "auth_audit_log_email_created_at_idx" ON "auth_audit_log"("email", "created_at");
CREATE INDEX "auth_audit_log_identity_id_created_at_idx" ON "auth_audit_log"("identity_id", "created_at");

-- CreateTable
CREATE TABLE "auth_login_lockout" (
    "identity_type" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "first_attempt_at" TIMESTAMPTZ(6),
    "locked_until" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "auth_login_lockout_pkey" PRIMARY KEY ("identity_type","email")
);
