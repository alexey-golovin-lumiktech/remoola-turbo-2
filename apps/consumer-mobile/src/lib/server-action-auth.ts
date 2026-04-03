import { cookies } from 'next/headers';

import { getConsumerMobileCsrfTokenCookieKeysForRead } from '@remoola/api-types';

import { getRequestOrigin } from './request-origin';

export function getCsrfTokenFromCookieHeader(cookieHeader: string): string {
  for (const key of getConsumerMobileCsrfTokenCookieKeysForRead()) {
    const match = cookieHeader
      .split(`;`)
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${key}=`));
    if (match) {
      return match.split(`=`).slice(1).join(`=`);
    }
  }
  return ``;
}

export async function getServerActionCookieHeader(): Promise<string> {
  return (await cookies()).toString();
}

export function buildServerReadAuthHeaders(cookieHeader: string | null): Record<string, string> {
  return {
    Cookie: cookieHeader ?? ``,
    origin: getRequestOrigin(),
  };
}

export async function getServerActionReadAuthHeaders(): Promise<Record<string, string>> {
  return buildServerReadAuthHeaders(await getServerActionCookieHeader());
}

export async function getServerActionMutationAuthHeaders(): Promise<Record<string, string>> {
  const cookieHeader = await getServerActionCookieHeader();
  const csrfToken = getCsrfTokenFromCookieHeader(cookieHeader);
  return {
    Cookie: cookieHeader,
    origin: getRequestOrigin(),
    ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
  };
}
