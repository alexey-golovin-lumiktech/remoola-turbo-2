ALTER TABLE "consumer"
ADD COLUMN "suspended_at" TIMESTAMPTZ(6),
ADD COLUMN "suspended_by" UUID,
ADD COLUMN "suspension_reason" TEXT;

INSERT INTO "admin_permission" ("capability")
VALUES
  ('consumers.suspend'),
  ('consumers.email_resend')
ON CONFLICT ("capability") DO NOTHING;

INSERT INTO "admin_role_permission" ("role_id", "permission_id")
SELECT role_model."id", permission_model."id"
FROM "admin_role" AS role_model
JOIN "admin_permission" AS permission_model
  ON permission_model."capability" IN (
    'consumers.suspend',
    'consumers.email_resend'
  )
WHERE role_model."key" = 'SUPER_ADMIN'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
