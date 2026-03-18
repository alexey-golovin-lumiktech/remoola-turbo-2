export const AUTH_NOTICE_QUERY = `auth_notice`;

export type AuthNotice = `password_changed` | `reset_success`;

const AUTH_NOTICE_MESSAGES: Record<AuthNotice, string> = {
  password_changed: `Password updated successfully. Please sign in again.`,
  reset_success: `Password reset successful. You can now sign in with your new password.`,
};

/**
 * Parses a query/param value into a valid AuthNotice. Accepts string | null | undefined
 * for compatibility with URLSearchParams.get() and optional params.
 */
export function parseAuthNotice(value: string | null | undefined): AuthNotice | undefined {
  if (value === `password_changed` || value === `reset_success`) {
    return value;
  }
  return undefined;
}

export function getAuthNoticeMessage(notice: AuthNotice): string {
  return AUTH_NOTICE_MESSAGES[notice];
}
