ALTER TABLE "admin"
ADD COLUMN "role_id" UUID;

UPDATE "admin" AS admin_row
SET "role_id" = role_model."id"
FROM "admin_role" AS role_model
WHERE admin_row."role_id" IS NULL
  AND (
    (admin_row."type"::text = 'SUPER' AND role_model."key" = 'SUPER_ADMIN')
    OR
    (admin_row."type"::text = 'ADMIN' AND role_model."key" = 'OPS_ADMIN')
  );

ALTER TABLE "admin"
ADD CONSTRAINT "admin_role_id_fkey"
FOREIGN KEY ("role_id") REFERENCES "admin_role"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

CREATE INDEX "admin_role_id_idx" ON "admin"("role_id");

CREATE TABLE "admin_permission_override" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "admin_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_permission_override_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "admin_permission_override_admin_id_fkey"
      FOREIGN KEY ("admin_id") REFERENCES "admin"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "admin_permission_override_permission_id_fkey"
      FOREIGN KEY ("permission_id") REFERENCES "admin_permission"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX "admin_permission_override_admin_id_permission_id_key"
ON "admin_permission_override"("admin_id", "permission_id");

CREATE INDEX "admin_permission_override_admin_id_idx"
ON "admin_permission_override"("admin_id");

CREATE INDEX "admin_permission_override_permission_id_idx"
ON "admin_permission_override"("permission_id");

ALTER TABLE "reset_password"
ADD COLUMN "admin_id" UUID;

ALTER TABLE "reset_password"
ALTER COLUMN "consumer_id" DROP NOT NULL;

ALTER TABLE "reset_password"
ADD CONSTRAINT "reset_password_admin_id_fkey"
FOREIGN KEY ("admin_id") REFERENCES "admin"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

CREATE INDEX "reset_password_admin_id_idx" ON "reset_password"("admin_id");

ALTER TABLE "reset_password"
ADD CONSTRAINT "reset_password_subject_check"
CHECK (
  (("consumer_id" IS NOT NULL) AND ("admin_id" IS NULL))
  OR
  (("consumer_id" IS NULL) AND ("admin_id" IS NOT NULL))
);

INSERT INTO "admin_permission" ("capability")
VALUES
  ('admins.read'),
  ('admins.manage')
ON CONFLICT ("capability") DO NOTHING;

INSERT INTO "admin_role_permission" ("role_id", "permission_id")
SELECT role_model."id", permission_model."id"
FROM "admin_role" AS role_model
JOIN "admin_permission" AS permission_model
  ON permission_model."capability" = 'admins.read'
WHERE role_model."key" = 'SUPER_ADMIN'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

INSERT INTO "admin_role_permission" ("role_id", "permission_id")
SELECT role_model."id", permission_model."id"
FROM "admin_role" AS role_model
JOIN "admin_permission" AS permission_model
  ON permission_model."capability" = 'admins.manage'
WHERE role_model."key" = 'SUPER_ADMIN'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
