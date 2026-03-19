/**
 * One-shot session-expired redirect for consumer-mobile.
 * Safe to call from multiple in-flight 401 handlers; only the first call performs redirect.
 * Clears auth cookies via BFF (required for httpOnly cookies) before redirect to prevent infinite loop.
 */

import { SESSION_EXPIRED_QUERY } from '@remoola/api-types';

export { SESSION_EXPIRED_QUERY };

const CLEAR_COOKIES_URL = `/api/consumer/auth/clear-cookies`;

let handled = false;
let redirectInProgress = false;

/** True after we have decided to redirect (handled). Callers can skip state updates to avoid stale frames. */
export function isRedirectInProgress(): boolean {
  return redirectInProgress;
}

/** Reset so next 401 is handled (e.g. after SPA navigate to login or fresh load). Call from login page on mount. */
export function resetSessionExpiredHandled(): void {
  handled = false;
  redirectInProgress = false;
}

/**
 * Redirect to login with session_expired and next. No-op if already on login/signup/forgot-password
 * or if this is not the first call in this page context.
 */
export function handleSessionExpired(): void {
  if (typeof window === `undefined`) return;

  const pathname = window.location.pathname ?? ``;
  if (
    pathname.startsWith(`/login`) ||
    pathname.startsWith(`/signup`) ||
    pathname.startsWith(`/auth/`) ||
    pathname.startsWith(`/forgot-password`)
  ) {
    return;
  }

  if (handled) return;
  handled = true;
  redirectInProgress = true;

  const currentPath = pathname + (window.location.search ?? ``);
  const loginUrl = `/login?${SESSION_EXPIRED_QUERY}=1&next=${encodeURIComponent(currentPath)}`;

  const clearThenRedirect = () => {
    window.location.replace(loginUrl);
  };

  fetch(CLEAR_COOKIES_URL, { method: `POST`, credentials: `include` })
    .then((res) => {
      if (!res.ok) {
        // Don't throw: redirect anyway; retry only on network failure
      }
    })
    .catch(() => fetch(CLEAR_COOKIES_URL, { method: `POST`, credentials: `include` }))
    .finally(clearThenRedirect);
}
