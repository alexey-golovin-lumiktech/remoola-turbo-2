import { randomUUID } from 'crypto';

import { cookies } from 'next/headers';

import { buildAdminMutationHeaders } from '../admin-auth-headers.server';
import { UPSTREAM_FETCH_TIMEOUT_MS, UPSTREAM_NETWORK_ERROR_MESSAGE } from '../api-utils';
import { getEnv } from '../env.server';

type MutationError = {
  code: string;
  message: string;
};

export type AdminMutationMetadata = {
  correlationId?: string;
  idempotencyKey?: string;
};

async function parseError(response: Response, fallbackMessage: string): Promise<MutationError> {
  const payload = (await response.json().catch(() => null)) as { code?: string; message?: string } | null;
  return {
    code: payload?.code ?? `API_ERROR`,
    message: payload?.message ?? fallbackMessage,
  };
}

async function requireBaseUrl(): Promise<string> {
  const env = getEnv();
  if (!env.NEXT_PUBLIC_API_BASE_URL) {
    throw new Error(`API base URL is not configured`);
  }
  return env.NEXT_PUBLIC_API_BASE_URL;
}

async function sendAdminMutation(
  method: `POST` | `PATCH` | `DELETE`,
  path: string,
  body: unknown,
  fallbackMessage: string,
  metadata?: AdminMutationMetadata,
): Promise<void> {
  const baseUrl = await requireBaseUrl();
  const cookieStore = await cookies();
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: buildAdminMutationHeaders(cookieStore.toString(), {
        'content-type': `application/json`,
        'x-correlation-id': metadata?.correlationId ?? randomUUID(),
        'Idempotency-Key': metadata?.idempotencyKey ?? randomUUID(),
      }),
      body: JSON.stringify(body),
      cache: `no-store`,
      signal: AbortSignal.timeout(UPSTREAM_FETCH_TIMEOUT_MS),
    });
  } catch {
    throw new Error(UPSTREAM_NETWORK_ERROR_MESSAGE);
  }

  if (!response.ok) {
    const error = await parseError(response, fallbackMessage);
    throw new Error(error.message);
  }
}

export async function postAdminMutation(
  path: string,
  body: unknown,
  fallbackMessage: string,
  metadata?: AdminMutationMetadata,
): Promise<void> {
  await sendAdminMutation(`POST`, path, body, fallbackMessage, metadata);
}

export async function patchAdminMutation(
  path: string,
  body: unknown,
  fallbackMessage: string,
  metadata?: AdminMutationMetadata,
): Promise<void> {
  await sendAdminMutation(`PATCH`, path, body, fallbackMessage, metadata);
}

export async function deleteAdminMutation(
  path: string,
  body: unknown,
  fallbackMessage: string,
  metadata?: AdminMutationMetadata,
): Promise<void> {
  await sendAdminMutation(`DELETE`, path, body, fallbackMessage, metadata);
}
