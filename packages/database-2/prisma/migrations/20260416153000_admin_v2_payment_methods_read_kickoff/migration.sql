INSERT INTO "admin_permission" ("capability")
VALUES ('payment_methods.read')
ON CONFLICT ("capability") DO NOTHING;

INSERT INTO "admin_role_permission" ("role_id", "permission_id")
SELECT role_model."id", permission_model."id"
FROM "admin_role" AS role_model
JOIN "admin_permission" AS permission_model
  ON permission_model."capability" = 'payment_methods.read'
WHERE role_model."key" IN ('SUPER_ADMIN', 'OPS_ADMIN')
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
