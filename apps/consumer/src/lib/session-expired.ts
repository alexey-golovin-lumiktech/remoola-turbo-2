/**
 * Centralized handling for 401 Unauthorized / session expired.
 * Fintech-safe: one redirect, one user-facing message, no token/raw error in UI.
 * Clears auth cookies via API (required for httpOnly cookies) before redirect to prevent infinite loop.
 */

import { toast } from 'sonner';

import { SESSION_EXPIRED_QUERY } from '@remoola/api-types';

const SESSION_EXPIRED_MESSAGE = `Your session has expired. Please sign in again.`;

const CLEAR_COOKIES_URL = `/api/consumer/auth/clear-cookies`;

export { SESSION_EXPIRED_QUERY };

let handled = false;
let redirectInProgress = false;

/** True after we have decided to redirect (handled). Callers can skip state updates to avoid stale frames. */
export function isRedirectInProgress(): boolean {
  return redirectInProgress;
}

/** Reset so next 401 is handled (e.g. after SPA navigate to login
 * or after fresh load). Call from login page on mount. */
export function resetSessionExpiredHandled(): void {
  handled = false;
  redirectInProgress = false;
}

/**
 * Call when any API returns 401. Clears auth cookies via API (so httpOnly cookies are removed),
 * then redirects to login. Prevents middleware from seeing token and redirecting login → dashboard (infinite loop).
 * Safe to call from multiple in-flight requests; only the first call performs redirect + toast.
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

  toast.error(SESSION_EXPIRED_MESSAGE);
  const next = encodeURIComponent(pathname + (window.location.search ?? ``));
  const loginUrl = `/login?next=${next}&${SESSION_EXPIRED_QUERY}=1`;

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

/** User-facing message for 401 (no raw backend message). */
export const UNAUTHORIZED_MESSAGE = SESSION_EXPIRED_MESSAGE;
