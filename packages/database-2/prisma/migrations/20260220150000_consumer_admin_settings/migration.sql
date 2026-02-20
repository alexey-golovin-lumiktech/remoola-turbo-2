-- Rename user_settings to consumer_settings (consumer-only preferences)
ALTER TABLE "user_settings" RENAME TO "consumer_settings";

-- Add preferred currency (display default only; nullable = fallback to USD in app)
ALTER TABLE "consumer_settings" ADD COLUMN "preferred_currency" "currency_code_enum" NULL;

-- Admin-only preferences table
CREATE TABLE "admin_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "theme" "theme_enum" NOT NULL DEFAULT 'SYSTEM',
    "adminId" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "admin_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_settings_adminId_key" ON "admin_settings"("adminId");

CREATE UNIQUE INDEX "admin_settings_adminId_deleted_at_key" ON "admin_settings"("adminId", "deleted_at");

ALTER TABLE "admin_settings" ADD CONSTRAINT "admin_settings_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admin"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
