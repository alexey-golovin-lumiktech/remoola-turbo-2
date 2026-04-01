export const AUTH_CALLBACK_MAX_SESSION_POLLS = 6;

export function getAuthCallbackSessionPollDelayMs(attempt: number): number {
  const safeAttempt = Math.max(0, Math.floor(attempt));
  return Math.min(1000, 250 * (safeAttempt + 1));
}
