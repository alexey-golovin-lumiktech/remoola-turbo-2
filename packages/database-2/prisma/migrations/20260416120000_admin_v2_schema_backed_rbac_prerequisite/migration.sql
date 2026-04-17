CREATE TABLE "admin_role" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_role_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "admin_permission" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "capability" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_permission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "admin_role_permission" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_role_permission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "admin_invitation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "role_id" UUID NOT NULL,
    "invited_by" UUID,
    "expires_at" TIMESTAMPTZ(6),
    "accepted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_invitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_role_key_key" ON "admin_role"("key");
CREATE UNIQUE INDEX "admin_permission_capability_key" ON "admin_permission"("capability");
CREATE UNIQUE INDEX "admin_role_permission_role_id_permission_id_key" ON "admin_role_permission"("role_id", "permission_id");

CREATE INDEX "admin_role_permission_role_id_idx" ON "admin_role_permission"("role_id");
CREATE INDEX "admin_role_permission_permission_id_idx" ON "admin_role_permission"("permission_id");
CREATE INDEX "admin_invitation_email_accepted_at_idx" ON "admin_invitation"("email", "accepted_at");
CREATE INDEX "admin_invitation_role_id_idx" ON "admin_invitation"("role_id");
CREATE INDEX "admin_invitation_invited_by_idx" ON "admin_invitation"("invited_by");
CREATE INDEX "admin_invitation_expires_at_idx" ON "admin_invitation"("expires_at");

ALTER TABLE "admin_role_permission"
    ADD CONSTRAINT "admin_role_permission_role_id_fkey"
    FOREIGN KEY ("role_id") REFERENCES "admin_role"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "admin_role_permission"
    ADD CONSTRAINT "admin_role_permission_permission_id_fkey"
    FOREIGN KEY ("permission_id") REFERENCES "admin_permission"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "admin_invitation"
    ADD CONSTRAINT "admin_invitation_role_id_fkey"
    FOREIGN KEY ("role_id") REFERENCES "admin_role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "admin_invitation"
    ADD CONSTRAINT "admin_invitation_invited_by_fkey"
    FOREIGN KEY ("invited_by") REFERENCES "admin"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

INSERT INTO "admin_role" ("key", "description")
VALUES
    ('SUPER_ADMIN', 'Phase-1 bridge super admin baseline'),
    ('OPS_ADMIN', 'Phase-1 bridge operations admin baseline')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "admin_permission" ("capability")
VALUES
    ('me.read'),
    ('overview.read'),
    ('verification.read'),
    ('consumers.read'),
    ('payments.read'),
    ('ledger.read'),
    ('audit.read'),
    ('consumers.notes'),
    ('consumers.flags'),
    ('consumers.force_logout'),
    ('verification.decide')
ON CONFLICT ("capability") DO NOTHING;

INSERT INTO "admin_role_permission" ("role_id", "permission_id")
SELECT role_model."id", permission_model."id"
FROM "admin_role" AS role_model
JOIN "admin_permission" AS permission_model
  ON permission_model."capability" IN (
    'me.read',
    'overview.read',
    'verification.read',
    'consumers.read',
    'payments.read',
    'ledger.read',
    'audit.read',
    'consumers.notes',
    'consumers.flags',
    'consumers.force_logout',
    'verification.decide'
  )
WHERE role_model."key" = 'SUPER_ADMIN'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

INSERT INTO "admin_role_permission" ("role_id", "permission_id")
SELECT role_model."id", permission_model."id"
FROM "admin_role" AS role_model
JOIN "admin_permission" AS permission_model
  ON permission_model."capability" IN (
    'me.read',
    'overview.read',
    'verification.read',
    'consumers.read',
    'payments.read',
    'ledger.read',
    'audit.read',
    'consumers.notes',
    'consumers.flags'
  )
WHERE role_model."key" = 'OPS_ADMIN'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
