export const SESSION_EXPIRED_ERROR_CODE = `SESSION_EXPIRED`;

export function isSessionExpiredErrorCode(code: string | null | undefined): boolean {
  return code === SESSION_EXPIRED_ERROR_CODE;
}
