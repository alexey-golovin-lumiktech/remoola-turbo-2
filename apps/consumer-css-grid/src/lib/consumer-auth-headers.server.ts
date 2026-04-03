import { getApiV2ConsumerCsrfTokenCookieKeysForRead } from '@remoola/api-types';

import { getRequestOrigin } from './request-origin';

function getCookieValue(cookieHeader: string, key: string): string | null {
  const match = cookieHeader
    .split(`;`)
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${key}=`));
  if (!match) return null;
  return match.split(`=`).slice(1).join(`=`);
}

export function getConsumerCsrfTokenFromCookieHeader(cookieHeader: string): string | null {
  if (!cookieHeader) return null;
  for (const key of getApiV2ConsumerCsrfTokenCookieKeysForRead()) {
    const token = getCookieValue(cookieHeader, key);
    if (token) return token;
  }
  return null;
}

export function buildConsumerMutationHeaders(
  cookieHeader: string,
  extraHeaders: Record<string, string> = {},
): Record<string, string> {
  const csrfToken = getConsumerCsrfTokenFromCookieHeader(cookieHeader);
  return {
    ...extraHeaders,
    Cookie: cookieHeader,
    origin: getRequestOrigin(),
    ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
  };
}
