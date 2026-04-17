INSERT INTO "admin_role" ("key", "description")
VALUES
  ('SUPPORT_ADMIN', 'Canonical MVP-2 support role label for schema-backed assignment'),
  ('RISK_ADMIN', 'Canonical MVP-2 risk role label for schema-backed assignment'),
  ('FINANCE_ADMIN', 'Canonical MVP-2 finance role label for schema-backed assignment'),
  ('READONLY_ADMIN', 'Canonical MVP-2 readonly role label for schema-backed assignment')
ON CONFLICT ("key") DO NOTHING;
