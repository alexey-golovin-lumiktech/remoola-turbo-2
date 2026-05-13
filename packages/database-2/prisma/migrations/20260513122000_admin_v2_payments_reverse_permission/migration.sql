INSERT INTO "admin_permission" ("capability")
VALUES ('payments.reverse')
ON CONFLICT ("capability") DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "admin_role" WHERE "key" = 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Cannot grant payments.reverse: SUPER_ADMIN role is missing';
  END IF;
END $$;

INSERT INTO "admin_role_permission" ("role_id", "permission_id")
SELECT role_model."id", permission_model."id"
FROM "admin_role" AS role_model
JOIN "admin_permission" AS permission_model
  ON permission_model."capability" = 'payments.reverse'
WHERE role_model."key" = 'SUPER_ADMIN'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
