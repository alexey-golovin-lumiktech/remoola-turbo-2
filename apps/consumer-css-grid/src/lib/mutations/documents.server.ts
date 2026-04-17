import { randomUUID } from 'crypto';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

import { SESSION_EXPIRED_ERROR_CODE } from '../auth-failure';
import { buildConsumerMutationHeaders } from '../consumer-auth-headers.server';
import { getEnv } from '../env.server';

type MutationResult =
  | { ok: true; message?: string }
  | { ok: false; error: { code: string; message: string; fields?: Record<string, string> } };

const NETWORK_ERROR_MESSAGE = `The request could not be completed because the network request failed. Please try again.`;

async function fetch(input: string | URL, init?: RequestInit): Promise<Response> {
  try {
    return await globalThis.fetch(input, init);
  } catch {
    return new Response(JSON.stringify({ code: `NETWORK_ERROR`, message: NETWORK_ERROR_MESSAGE }), {
      status: 503,
      headers: { 'content-type': `application/json` },
    });
  }
}

function invalid(message: string, fields?: Record<string, string>): MutationResult {
  return {
    ok: false,
    error: {
      code: `VALIDATION_ERROR`,
      message,
      ...(fields ? { fields } : {}),
    },
  };
}

async function parseError(res: Response, fallbackMessage: string) {
  if (res.status === 401) {
    return {
      code: SESSION_EXPIRED_ERROR_CODE,
      message: `Your session has expired. Please sign in again.`,
    };
  }

  const payload = (await res.json().catch(() => null)) as { code?: string; message?: string } | null;
  return {
    code: payload?.code ?? `API_ERROR`,
    message: payload?.message ?? fallbackMessage,
  };
}

function configuredBaseUrl(): string | null {
  const env = getEnv();
  return env.NEXT_PUBLIC_API_BASE_URL || null;
}

export async function deleteDocumentMutation(documentId: string): Promise<MutationResult> {
  if (!documentId.trim()) {
    return invalid(`Invalid document id`);
  }

  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    return {
      ok: false,
      error: { code: `CONFIG_ERROR`, message: `API base URL is not configured` },
    };
  }

  const cookieStore = await cookies();
  const response = await fetch(`${baseUrl}/consumer/documents/${documentId}`, {
    method: `DELETE`,
    headers: {
      ...buildConsumerMutationHeaders(cookieStore.toString()),
    },
    cache: `no-store`,
  });

  if (!response.ok) {
    const error = await parseError(response, `Failed to delete document`);
    return { ok: false, error };
  }

  revalidatePath(`/documents`);
  revalidatePath(`/dashboard`);
  return { ok: true, message: `Document deleted` };
}

export async function bulkDeleteDocumentsMutation(documentIds: string[]): Promise<MutationResult> {
  const ids = documentIds.map((id) => id.trim()).filter(Boolean);
  if (ids.length === 0) {
    return invalid(`Please select at least one document`, {
      documentIds: `At least one document must be selected`,
    });
  }

  const baseUrl = configuredBaseUrl();
  if (!baseUrl) {
    return {
      ok: false,
      error: { code: `CONFIG_ERROR`, message: `API base URL is not configured` },
    };
  }

  const cookieStore = await cookies();
  const response = await fetch(`${baseUrl}/consumer/documents/bulk-delete`, {
    method: `POST`,
    headers: {
      'content-type': `application/json`,
      ...buildConsumerMutationHeaders(cookieStore.toString()),
      'x-correlation-id': randomUUID(),
    },
    body: JSON.stringify({ ids }),
    cache: `no-store`,
  });

  if (!response.ok) {
    const error = await parseError(response, `Failed to delete documents`);
    return { ok: false, error };
  }

  revalidatePath(`/documents`);
  revalidatePath(`/dashboard`);
  return {
    ok: true,
    message: ids.length === 1 ? `Document deleted` : `${ids.length} documents deleted`,
  };
}

export async function updateDocumentTagsMutation(documentId: string, rawTags: string): Promise<MutationResult> {
  const id = documentId.trim();
  if (!id) {
    return invalid(`Invalid document id`);
  }

  const tags = Array.from(
    new Set(
      rawTags
        .split(`,`)
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    ),
  ).slice(0, 20);

  const baseUrl = configuredBaseUrl();
  if (!baseUrl) {
    return {
      ok: false,
      error: { code: `CONFIG_ERROR`, message: `API base URL is not configured` },
    };
  }

  const cookieStore = await cookies();
  const response = await fetch(`${baseUrl}/consumer/documents/${id}/tags`, {
    method: `POST`,
    headers: {
      'content-type': `application/json`,
      ...buildConsumerMutationHeaders(cookieStore.toString()),
    },
    body: JSON.stringify({ tags }),
    cache: `no-store`,
  });

  if (!response.ok) {
    const error = await parseError(response, `Failed to update document tags`);
    return { ok: false, error };
  }

  revalidatePath(`/documents`);
  return { ok: true, message: `Document tags updated` };
}
