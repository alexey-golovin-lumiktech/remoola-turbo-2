export const AUTH_NOTICE_QUERY = `auth_notice`;

export type AuthNotice =
  | `password_changed`
  | `password_set`
  | `reset_success`
  | `google_signin_required`
  | `signed_out_all_sessions`;

const AUTH_NOTICE_MESSAGES: Record<AuthNotice, string> = {
  password_changed: `Password updated successfully. Please sign in again.`,
  password_set: `Password created successfully. You can now sign in with Google or your email and password.`,
  reset_success: `Password reset successful. You can now sign in with your new password.`,
  google_signin_required:
    `This account uses Google Sign-In. Continue with Google to access your account, ` +
    `then create a password from Settings if needed.`,
  signed_out_all_sessions: `All active sessions were signed out. Please sign in again.`,
};

/**
 * Parses a query/param value into a valid AuthNotice. Accepts string | null | undefined
 * for compatibility with URLSearchParams.get() and optional params.
 */
export function parseAuthNotice(value: string | null | undefined): AuthNotice | undefined {
  if (
    value === `password_changed` ||
    value === `password_set` ||
    value === `reset_success` ||
    value === `google_signin_required` ||
    value === `signed_out_all_sessions`
  ) {
    return value;
  }
  return undefined;
}

export function getAuthNoticeMessage(notice: AuthNotice): string {
  return AUTH_NOTICE_MESSAGES[notice];
}
