import { getAdminCsrfTokenCookieKeysForRead } from '@remoola/api-types';

import { getPreferredCookieValue } from './cookies';
import { getBypassHeaders, getRequestOrigin } from './request-origin';

function getAdminCsrfTokenFromCookieHeader(cookieHeader: string): string | null {
  if (!cookieHeader) return null;
  const keys = getAdminCsrfTokenCookieKeysForRead();
  return getPreferredCookieValue(cookieHeader, keys[0] ?? ``, keys) ?? null;
}

export function buildAdminMutationHeaders(
  cookieHeader: string,
  extraHeaders: Record<string, string> = {},
): Record<string, string> {
  const csrfToken = getAdminCsrfTokenFromCookieHeader(cookieHeader);
  return {
    ...extraHeaders,
    Cookie: cookieHeader,
    origin: getRequestOrigin(),
    ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
    ...getBypassHeaders(),
  };
}
