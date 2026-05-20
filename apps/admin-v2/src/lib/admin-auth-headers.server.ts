import { getAdminCsrfTokenCookieKeysForRead } from '@remoola/api-types';

import { getCookieValue } from './cookies';
import { getBypassHeaders, getRequestOrigin } from './request-origin';

function getAdminCsrfTokenFromCookieHeader(cookieHeader: string): string | null {
  if (!cookieHeader) return null;
  for (const key of getAdminCsrfTokenCookieKeysForRead()) {
    const token = getCookieValue(cookieHeader, key);
    if (token) return token;
  }
  return null;
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
