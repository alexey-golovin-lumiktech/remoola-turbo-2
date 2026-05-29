'use server';

import { randomUUID } from 'crypto';

import { revalidatePath } from 'next/cache';

import { encodeApiPathSegment } from '../api-path';
import {
  configuredBaseUrl,
  consumerMutationHeaders,
  fetch,
  invalid,
  parseError,
  type MutationResult,
} from './mutation-runtime.server';

export async function deleteDocumentMutation(documentId: string): Promise<MutationResult> {
  if (!documentId.trim()) {
    return invalid(`Invalid document id`);
  }

  const baseUrl = configuredBaseUrl();
  if (!baseUrl) {
    return {
      ok: false,
      error: { code: `CONFIG_ERROR`, message: `API base URL is not configured` },
    };
  }

  const response = await fetch(`${baseUrl}/consumer/documents/${encodeApiPathSegment(documentId)}`, {
    method: `DELETE`,
    headers: {
      ...(await consumerMutationHeaders()),
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

  const response = await fetch(`${baseUrl}/consumer/documents/bulk-delete`, {
    method: `POST`,
    headers: {
      'content-type': `application/json`,
      ...(await consumerMutationHeaders()),
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

  const response = await fetch(`${baseUrl}/consumer/documents/${encodeApiPathSegment(id)}/tags`, {
    method: `POST`,
    headers: {
      'content-type': `application/json`,
      ...(await consumerMutationHeaders()),
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
