import 'server-only';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { SESSION_EXPIRED_QUERY, sanitizeNextForRedirect } from '@remoola/api-types';

import { buildConsumerReadHeaders } from './consumer-auth-headers.server';
import { getEnv } from './env.server';

export interface ConsumerApiRequestOptions {
  redirectTo?: string;
}

function buildSessionExpiredLoginUrl(redirectTo: string): string {
  const safeNext = encodeURIComponent(sanitizeNextForRedirect(redirectTo, `/dashboard`));
  return `/login?${SESSION_EXPIRED_QUERY}=1&next=${safeNext}`;
}

export function redirectOnUnauthorized(options?: ConsumerApiRequestOptions): void {
  if (!options?.redirectTo) return;
  redirect(buildSessionExpiredLoginUrl(options.redirectTo));
}

export function isRedirectControlFlow(error: unknown): boolean {
  if (typeof error !== `object` || error === null) {
    return false;
  }
  const digest = `digest` in error ? error.digest : undefined;
  if (typeof digest === `string` && digest.startsWith(`NEXT_REDIRECT`)) {
    return true;
  }
  const message = `message` in error ? error.message : undefined;
  return typeof message === `string` && message.startsWith(`NEXT_REDIRECT`);
}

export async function fetchConsumerApi<T>(path: string, options?: ConsumerApiRequestOptions): Promise<T | null> {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) return null;

  try {
    const cookieStore = await cookies();
    const response = await fetch(`${baseUrl}${path}`, {
      method: `GET`,
      headers: buildConsumerReadHeaders(cookieStore.toString()),
      cache: `no-store`,
      signal: AbortSignal.timeout(15000),
    });

    if (response.status === 401) {
      redirectOnUnauthorized(options);
      return null;
    }
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch (error) {
    if (isRedirectControlFlow(error)) throw error;
    return null;
  }
}
