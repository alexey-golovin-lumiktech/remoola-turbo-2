-- Backfill: canonicalize fixture-only literal that production never wrote.
-- Source line: packages/db-fixtures/src/admin-v2-scenarios.ts:1577 (pre-3.5d).
UPDATE "admin_auth_sessions"
   SET "invalidated_reason" = 'admin_deactivated'
 WHERE "invalidated_reason" = 'fixture_force_logout_after_risk_review';

-- Defensive: any other unknown literal that may have been written by drift
-- gets canonicalized to 'manual_revoke' (the most generic admin-initiated
-- revoke). This is intentional: silently dropping such a row would lose
-- forensic evidence; canonicalizing keeps the row + revokedAt + lastUsedAt
-- intact while making the new CHECK constraint applicable.
UPDATE "admin_auth_sessions"
   SET "invalidated_reason" = 'manual_revoke'
 WHERE "invalidated_reason" IS NOT NULL
   AND "invalidated_reason" NOT IN (
     'rotated',
     'manual_revoke',
     'cross_admin_revoked',
     'logout',
     'refresh_reuse_detected',
     'password_reset',
     'admin_deactivated'
   );

-- Apply the typed allowlist.
ALTER TABLE "admin_auth_sessions"
ADD CONSTRAINT "admin_auth_session_invalidated_reason_check"
  CHECK (
    "invalidated_reason" IS NULL
    OR "invalidated_reason" IN (
      'rotated',
      'manual_revoke',
      'cross_admin_revoked',
      'logout',
      'refresh_reuse_detected',
      'password_reset',
      'admin_deactivated'
    )
  );
