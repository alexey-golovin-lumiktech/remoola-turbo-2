'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

import {
  attachToPaymentSchema,
  bulkDeleteSchema,
  updateTagsSchema,
  type AttachToPaymentInput,
  type BulkDeleteInput,
  type UpdateTagsInput,
} from './schemas';
import { getEnv } from '../../lib/env.server';
import { generateCorrelationId, serverLogger } from '../../lib/logger.server';

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; fields?: Record<string, string> } };

/**
 * Bulk delete documents
 * @param input - Array of document IDs to delete
 * @returns ActionResult
 */
export async function bulkDeleteDocuments(input: BulkDeleteInput): Promise<ActionResult> {
  const correlationId = generateCorrelationId();
  const parsed = bulkDeleteSchema.safeParse(input);

  if (!parsed.success) {
    serverLogger.warn(`Bulk delete validation failed`, {
      correlationId,
      errors: parsed.error.flatten(),
    });
    return {
      ok: false,
      error: {
        code: `VALIDATION_ERROR`,
        message: `Please select documents to delete`,
        fields: Object.fromEntries(parsed.error.issues.map((e) => [e.path.join(`.`), e.message])),
      },
    };
  }

  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    serverLogger.error(`API base URL not configured`, { correlationId });
    return {
      ok: false,
      error: {
        code: `CONFIG_ERROR`,
        message: `Service temporarily unavailable`,
      },
    };
  }

  try {
    serverLogger.auditLog(`DOCUMENTS_BULK_DELETE`, {
      documentCount: parsed.data.documentIds.length,
      correlationId,
    });

    const cookieStore = await cookies();
    const cookie = cookieStore.toString();

    const res = await fetch(`${baseUrl}/consumer/documents/bulk-delete`, {
      method: `POST`,
      headers: {
        'Content-Type': `application/json`,
        Cookie: cookie,
        'X-Correlation-ID': correlationId,
      },
      body: JSON.stringify({ documentIds: parsed.data.documentIds }),
      credentials: `include`,
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const errorData = await res
        .json()
        .catch(() => ({ code: `UNKNOWN_ERROR`, message: `Failed to delete documents` }));

      serverLogger.error(`Bulk delete failed`, {
        correlationId,
        status: res.status,
        errorCode: errorData.code,
      });

      return {
        ok: false,
        error: {
          code: errorData.code ?? `DELETE_ERROR`,
          message: errorData.message ?? `Unable to delete documents. Please try again.`,
        },
      };
    }

    serverLogger.info(`Documents deleted successfully`, { correlationId });
    revalidatePath(`/documents`);

    return { ok: true, data: undefined };
  } catch (error) {
    serverLogger.error(`Bulk delete exception`, { correlationId, error });
    return {
      ok: false,
      error: {
        code: `NETWORK_ERROR`,
        message: `Network error. Please check your connection.`,
      },
    };
  }
}

/**
 * Attach document to payment request
 * @param input - Document ID and payment request ID
 * @returns ActionResult
 */
export async function attachDocumentToPayment(input: AttachToPaymentInput): Promise<ActionResult> {
  const parsed = attachToPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: `VALIDATION_ERROR`,
        message: `Invalid input`,
        fields: Object.fromEntries(parsed.error.issues.map((e) => [e.path.join(`.`), e.message])),
      },
    };
  }

  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    return {
      ok: false,
      error: {
        code: `CONFIG_ERROR`,
        message: `API base URL not configured`,
      },
    };
  }

  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.toString();

    const res = await fetch(`${baseUrl}/consumer/documents/attach-to-payment`, {
      method: `POST`,
      headers: {
        'Content-Type': `application/json`,
        Cookie: cookie,
      },
      body: JSON.stringify({
        documentId: parsed.data.documentId,
        paymentRequestId: parsed.data.paymentRequestId,
      }),
      credentials: `include`,
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ code: `UNKNOWN_ERROR`, message: `Failed to attach document` }));
      return {
        ok: false,
        error: {
          code: errorData.code ?? `ATTACH_ERROR`,
          message: errorData.message ?? `Failed to attach document to payment`,
        },
      };
    }

    revalidatePath(`/documents`);
    revalidatePath(`/payments/[paymentRequestId]`, `page`);

    return { ok: true, data: undefined };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: `NETWORK_ERROR`,
        message: error instanceof Error ? error.message : `Network error occurred`,
      },
    };
  }
}

/**
 * Update document tags
 * @param docId - Document ID
 * @param input - Array of tags
 * @returns ActionResult
 */
export async function updateDocumentTags(docId: string, input: UpdateTagsInput): Promise<ActionResult> {
  if (!docId || typeof docId !== `string` || docId.trim() === ``) {
    return {
      ok: false,
      error: {
        code: `VALIDATION_ERROR`,
        message: `Valid document ID required`,
      },
    };
  }

  const parsed = updateTagsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: `VALIDATION_ERROR`,
        message: `Invalid input`,
        fields: Object.fromEntries(parsed.error.issues.map((e) => [e.path.join(`.`), e.message])),
      },
    };
  }

  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    return {
      ok: false,
      error: {
        code: `CONFIG_ERROR`,
        message: `API base URL not configured`,
      },
    };
  }

  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.toString();

    const res = await fetch(`${baseUrl}/consumer/documents/${docId}/tags`, {
      method: `POST`,
      headers: {
        'Content-Type': `application/json`,
        Cookie: cookie,
      },
      body: JSON.stringify({ tags: parsed.data.tags }),
      credentials: `include`,
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ code: `UNKNOWN_ERROR`, message: `Failed to update tags` }));
      return {
        ok: false,
        error: {
          code: errorData.code ?? `UPDATE_ERROR`,
          message: errorData.message ?? `Failed to update document tags`,
        },
      };
    }

    revalidatePath(`/documents`);

    return { ok: true, data: undefined };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: `NETWORK_ERROR`,
        message: error instanceof Error ? error.message : `Network error occurred`,
      },
    };
  }
}

/**
 * Delete a single document
 * @param docId - Document ID
 * @returns ActionResult
 */
export async function deleteDocument(docId: string): Promise<ActionResult> {
  if (!docId || typeof docId !== `string` || docId.trim() === ``) {
    return {
      ok: false,
      error: {
        code: `VALIDATION_ERROR`,
        message: `Valid document ID required`,
      },
    };
  }

  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    return {
      ok: false,
      error: {
        code: `CONFIG_ERROR`,
        message: `API base URL not configured`,
      },
    };
  }

  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.toString();

    const res = await fetch(`${baseUrl}/consumer/documents/${docId}`, {
      method: `DELETE`,
      headers: {
        Cookie: cookie,
      },
      credentials: `include`,
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ code: `UNKNOWN_ERROR`, message: `Failed to delete document` }));
      return {
        ok: false,
        error: {
          code: errorData.code ?? `DELETE_ERROR`,
          message: errorData.message ?? `Failed to delete document`,
        },
      };
    }

    revalidatePath(`/documents`);

    return { ok: true, data: undefined };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: `NETWORK_ERROR`,
        message: error instanceof Error ? error.message : `Network error occurred`,
      },
    };
  }
}
