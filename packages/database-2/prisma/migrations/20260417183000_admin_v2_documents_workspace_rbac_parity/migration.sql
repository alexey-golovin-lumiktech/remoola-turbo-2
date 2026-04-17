INSERT INTO "admin_permission" ("capability")
VALUES
  ('documents.read'),
  ('documents.manage')
ON CONFLICT ("capability") DO NOTHING;

INSERT INTO "admin_role_permission" ("role_id", "permission_id")
SELECT role_model."id", permission_model."id"
FROM "admin_role" AS role_model
JOIN "admin_permission" AS permission_model
  ON permission_model."capability" = 'documents.read'
WHERE role_model."key" IN ('SUPER_ADMIN', 'OPS_ADMIN')
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

INSERT INTO "admin_role_permission" ("role_id", "permission_id")
SELECT role_model."id", permission_model."id"
FROM "admin_role" AS role_model
JOIN "admin_permission" AS permission_model
  ON permission_model."capability" = 'documents.manage'
WHERE role_model."key" = 'SUPER_ADMIN'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
