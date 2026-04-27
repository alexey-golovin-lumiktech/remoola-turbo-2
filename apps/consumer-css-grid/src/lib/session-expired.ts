import { SESSION_EXPIRED_QUERY } from '@remoola/api-types';

import { isSessionExpiredErrorCode } from './auth-failure';

export { SESSION_EXPIRED_QUERY };

const CLEAR_COOKIES_URL = `/api/consumer/auth/clear-cookies`;

let handled = false;
let redirectInProgress = false;

export function isRedirectInProgress(): boolean {
  return redirectInProgress;
}

export function resetSessionExpiredHandled(): void {
  handled = false;
  redirectInProgress = false;
}

export function handleSessionExpiredError(error: { code?: string | null } | null | undefined): boolean {
  if (!isSessionExpiredErrorCode(error?.code)) {
    return false;
  }

  handleSessionExpired();
  return true;
}

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
    .then(() => undefined)
    .catch(() => fetch(CLEAR_COOKIES_URL, { method: `POST`, credentials: `include` }))
    .finally(clearThenRedirect);
}
