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
    'exchange.read',
    'documents.read',
    'payment_methods.read',
    'system.read',
    'audit.read',
    'consumers.notes',
    'consumers.flags',
    'consumers.email_resend'
  )
WHERE role_model."key" = 'SUPPORT_ADMIN'
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
    'exchange.read',
    'documents.read',
    'payment_methods.read',
    'system.read',
    'audit.read',
    'verification.decide',
    'consumers.force_logout',
    'consumers.suspend'
  )
WHERE role_model."key" = 'RISK_ADMIN'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

INSERT INTO "admin_role_permission" ("role_id", "permission_id")
SELECT role_model."id", permission_model."id"
FROM "admin_role" AS role_model
JOIN "admin_permission" AS permission_model
  ON permission_model."capability" IN (
    'me.read',
    'overview.read',
    'payments.read',
    'ledger.read',
    'exchange.read',
    'documents.read',
    'payment_methods.read',
    'system.read',
    'audit.read',
    'payouts.escalate'
  )
WHERE role_model."key" = 'FINANCE_ADMIN'
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
    'exchange.read',
    'documents.read',
    'payment_methods.read',
    'system.read',
    'admins.read',
    'audit.read'
  )
WHERE role_model."key" = 'READONLY_ADMIN'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
