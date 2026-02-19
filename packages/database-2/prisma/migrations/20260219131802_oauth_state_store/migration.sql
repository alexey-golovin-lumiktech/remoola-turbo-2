-- CreateTable: oauth_state for DB-backed OAuth state store (replaces Redis).
CREATE TABLE "oauth_state" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "state_key" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_state_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "oauth_state_state_key_key" ON "oauth_state"("state_key");

-- CreateIndex (for cron cleanup: DELETE WHERE expires_at < NOW())
CREATE INDEX "oauth_state_expires_at_idx" ON "oauth_state"("expires_at");
