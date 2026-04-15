'use server';

import { randomUUID } from 'crypto';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

import { buildAdminMutationHeaders } from './admin-auth-headers.server';
import { getEnv } from './env.server';

type MutationError = {
  code: string;
  message: string;
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

export async function createConsumerNoteAction(consumerId: string, formData: FormData): Promise<void> {
  const content = String(formData.get(`content`) ?? ``).trim();
  if (!content) {
    return;
  }
  const baseUrl = await requireBaseUrl();
  const cookieStore = await cookies();
  const response = await fetch(`${baseUrl}/admin-v2/consumers/${consumerId}/notes`, {
    method: `POST`,
    headers: buildAdminMutationHeaders(cookieStore.toString(), {
      'content-type': `application/json`,
      'x-correlation-id': randomUUID(),
    }),
    body: JSON.stringify({ content }),
    cache: `no-store`,
  });

  if (!response.ok) {
    const error = await parseError(response, `Failed to create note`);
    throw new Error(error.message);
  }

  revalidatePath(`/consumers`);
  revalidatePath(`/consumers/${consumerId}`);
}

export async function addConsumerFlagAction(consumerId: string, formData: FormData): Promise<void> {
  const flag = String(formData.get(`flag`) ?? ``).trim();
  const reason = String(formData.get(`reason`) ?? ``).trim();
  if (!flag) {
    return;
  }
  const baseUrl = await requireBaseUrl();
  const cookieStore = await cookies();
  const response = await fetch(`${baseUrl}/admin-v2/consumers/${consumerId}/flags`, {
    method: `POST`,
    headers: buildAdminMutationHeaders(cookieStore.toString(), {
      'content-type': `application/json`,
      'x-correlation-id': randomUUID(),
    }),
    body: JSON.stringify({ flag, reason: reason || null }),
    cache: `no-store`,
  });

  if (!response.ok) {
    const error = await parseError(response, `Failed to add flag`);
    throw new Error(error.message);
  }

  revalidatePath(`/consumers`);
  revalidatePath(`/consumers/${consumerId}`);
}

export async function removeConsumerFlagAction(consumerId: string, flagId: string, formData: FormData): Promise<void> {
  const version = Number(formData.get(`version`) ?? 0);
  const baseUrl = await requireBaseUrl();
  const cookieStore = await cookies();
  const response = await fetch(`${baseUrl}/admin-v2/consumers/${consumerId}/flags/${flagId}/remove`, {
    method: `POST`,
    headers: buildAdminMutationHeaders(cookieStore.toString(), {
      'content-type': `application/json`,
      'x-correlation-id': randomUUID(),
    }),
    body: JSON.stringify({ version }),
    cache: `no-store`,
  });

  if (!response.ok) {
    const error = await parseError(response, `Failed to remove flag`);
    throw new Error(error.message);
  }

  revalidatePath(`/consumers`);
  revalidatePath(`/consumers/${consumerId}`);
}
