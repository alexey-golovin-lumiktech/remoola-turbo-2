export const ADMIN_AUTH_SESSION_REVOKE_REASONS = {
  rotated: `rotated`,
  manual_revoke: `manual_revoke`,
  cross_admin_revoked: `cross_admin_revoked`,
  logout: `logout`,
  refresh_reuse_detected: `refresh_reuse_detected`,
  password_reset: `password_reset`,
  admin_deactivated: `admin_deactivated`,
} as const;

export type AdminAuthSessionRevokeReason =
  (typeof ADMIN_AUTH_SESSION_REVOKE_REASONS)[keyof typeof ADMIN_AUTH_SESSION_REVOKE_REASONS];
