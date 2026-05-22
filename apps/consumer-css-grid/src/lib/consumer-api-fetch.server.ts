import 'server-only';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { SESSION_EXPIRED_QUERY, sanitizeNextForRedirect } from '@remoola/api-types';

import { buildConsumerMutationHeaders, buildConsumerReadHeaders } from './consumer-auth-headers.server';
import { getEnv } from './env.server';

export interface ConsumerApiRequestOptions {
  redirectTo?: string;
}

export type ConsumerApiResult<T> = { data: T | null; unavailable: boolean };

function buildSessionExpiredLoginUrl(redirectTo: string): string {
  const safeNext = encodeURIComponent(sanitizeNextForRedirect(redirectTo, `/dashboard`));
  return `/login?${SESSION_EXPIRED_QUERY}=1&next=${safeNext}`;
}

function redirectOnUnauthorized(options?: ConsumerApiRequestOptions): void {
  if (!options?.redirectTo) return;
  redirect(buildSessionExpiredLoginUrl(options.redirectTo));
}

export async function fetchConsumerApi<T>(path: string, options?: ConsumerApiRequestOptions): Promise<T | null> {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) return null;

  let response: Response;
  try {
    const cookieStore = await cookies();
    response = await fetch(`${baseUrl}${path}`, {
      method: `GET`,
      headers: buildConsumerReadHeaders(cookieStore.toString()),
      cache: `no-store`,
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return null;
  }

  if (response.status === 401) {
    redirectOnUnauthorized(options);
    return null;
  }
  if (!response.ok) return null;

  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function postConsumerApi<T>(
  path: string,
  body: unknown,
  options?: ConsumerApiRequestOptions,
): Promise<T | null> {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) return null;

  let response: Response;
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();
    response = await fetch(`${baseUrl}${path}`, {
      method: `POST`,
      headers: buildConsumerMutationHeaders(cookieHeader, {
        'content-type': `application/json`,
      }),
      body: JSON.stringify(body),
      cache: `no-store`,
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return null;
  }

  if (response.status === 401) {
    redirectOnUnauthorized(options);
    return null;
  }
  if (!response.ok) return null;

  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchConsumerApiResult<T>(
  path: string,
  options?: ConsumerApiRequestOptions,
): Promise<ConsumerApiResult<T>> {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    return { data: null, unavailable: true };
  }

  let response: Response;
  try {
    const cookieStore = await cookies();
    response = await fetch(`${baseUrl}${path}`, {
      method: `GET`,
      headers: buildConsumerReadHeaders(cookieStore.toString()),
      cache: `no-store`,
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return { data: null, unavailable: true };
  }

  if (response.status === 401) {
    redirectOnUnauthorized(options);
    return { data: null, unavailable: false };
  }
  if (!response.ok) {
    return { data: null, unavailable: true };
  }

  try {
    return {
      data: (await response.json()) as T,
      unavailable: false,
    };
  } catch {
    return { data: null, unavailable: true };
  }
}
