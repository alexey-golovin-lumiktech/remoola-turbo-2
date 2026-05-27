import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { fetchUpstream } from '../api-utils';
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

type ReadSchema = {
  safeParse(data: unknown): { success: true; data: unknown } | { success: false };
};

export async function fetchAdminApiResult<T>(path: string, schema: ReadSchema): Promise<AdminApiReadResult<T>> {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) return { status: `error` };

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const origin = getRequestOrigin();

  const response = await fetchUpstream(`${baseUrl}${path}`, {
    method: `GET`,
    headers: {
      Cookie: cookieHeader,
      origin,
    },
  });

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
    const parsed = schema.safeParse(await response.json());
    if (!parsed.success) {
      return { status: `error` };
    }
    return { status: `ready`, data: parsed.data as T };
  } catch {
    return { status: `error` };
  }
}

export async function fetchAdminApi<T>(path: string, schema: ReadSchema): Promise<T | null> {
  const result = await fetchAdminApiResult<T>(path, schema);
  return result.status === `ready` ? result.data : null;
}
