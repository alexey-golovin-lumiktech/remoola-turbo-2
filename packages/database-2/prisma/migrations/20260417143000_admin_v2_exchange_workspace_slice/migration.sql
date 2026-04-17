CREATE INDEX "exchange_rate_status_effective_at_idx"
ON "exchange_rate"("status", "effective_at");

INSERT INTO "admin_permission" ("capability")
VALUES
  ('exchange.read'),
  ('exchange.manage')
ON CONFLICT ("capability") DO NOTHING;

INSERT INTO "admin_role_permission" ("role_id", "permission_id")
SELECT role_model."id", permission_model."id"
FROM "admin_role" AS role_model
JOIN "admin_permission" AS permission_model
  ON permission_model."capability" = 'exchange.read'
WHERE role_model."key" IN ('SUPER_ADMIN', 'OPS_ADMIN')
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

INSERT INTO "admin_role_permission" ("role_id", "permission_id")
SELECT role_model."id", permission_model."id"
FROM "admin_role" AS role_model
JOIN "admin_permission" AS permission_model
  ON permission_model."capability" = 'exchange.manage'
WHERE role_model."key" = 'SUPER_ADMIN'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
