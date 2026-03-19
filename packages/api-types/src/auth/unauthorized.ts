/** True when error is from auth failure (401/403); do not show Retry or generic error UI. */
export function isUnauthorizedError(error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  return status === 401 || status === 403;
}
