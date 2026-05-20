import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { getEnv } from '../env.server';
import { getRequestOrigin } from '../request-origin';

function redirectToLogin() {
  redirect(`/login?sessionExpired=1`);
}

export type AdminApiReadResult<T> =
  | { status: `ready`; data: T }
  | { status: `forbidden` }
  | { status: `not_found` }
  | { status: `error` };

export async function fetchAdminApiResult<T>(path: string): Promise<AdminApiReadResult<T>> {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) return { status: `error` };

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const origin = getRequestOrigin();

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: `GET`,
      headers: {
        Cookie: cookieHeader,
        origin,
      },
      cache: `no-store`,
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return { status: `error` };
  }

  if (response.status === 401) {
    redirectToLogin();
  }
  if (response.status === 403) {
    return { status: `forbidden` };
  }
  if (response.status === 404) {
    return { status: `not_found` };
  }
  if (!response.ok) {
    return { status: `error` };
  }

  try {
    return { status: `ready`, data: (await response.json()) as T };
  } catch {
    return { status: `error` };
  }
}

export async function fetchAdminApi<T>(path: string): Promise<T | null> {
  const result = await fetchAdminApiResult<T>(path);
  return result.status === `ready` ? result.data : null;
}
