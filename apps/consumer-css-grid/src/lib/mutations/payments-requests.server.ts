import 'server-only';

import { revalidatePath } from 'next/cache';

import {
  type ConsumerCreatePaymentRequestPayload,
  type ConsumerCreatePaymentRequestResponse,
  type ConsumerPaymentsResponse,
  type ConsumerStartPaymentPayload,
  type ConsumerStartPaymentResponse,
} from '@remoola/api-types';

import { isDateInputTodayOrLater, normalizeDateInput } from '../date-input';
import {
  APP_SCOPE,
  configuredBaseUrl,
  consumerMutationHeaders,
  fetch,
  invalid,
  isValidEmail,
  parseError,
  parseMajorAmountInput,
  revalidateContractPaths,
  type MutationResult,
  type PaymentFlowMutationContext,
} from './mutation-runtime.server';

export type PaymentRequestCreateResult =
  | { ok: true; paymentRequestId?: string; message?: string }
  | { ok: false; error: { code: string; message: string; fields?: Record<string, string> } };

export type StartPaymentResult =
  | { ok: true; paymentRequestId?: string; ledgerId?: string; message?: string }
  | { ok: false; error: { code: string; message: string; fields?: Record<string, string> } };

export type DraftPaymentRequestOption = {
  id: string;
  amount: number;
  currencyCode: string;
  createdAt: string;
  description: string | null;
  counterpartyEmail: string | null;
};

export type DraftPaymentRequestsResult =
  | {
      ok: true;
      items: DraftPaymentRequestOption[];
      total: number;
      page: number;
      pageSize: number;
    }
  | { ok: false; error: { code: string; message: string } };

export type AttachDocumentToDraftPaymentsResult =
  | {
      ok: true;
      attachedCount: number;
      message: string;
    }
  | {
      ok: false;
      attachedCount: number;
      error: { code: string; message: string; fields?: Record<string, string> };
    };

export async function createPaymentRequestMutation(input: {
  email: ConsumerCreatePaymentRequestPayload[`email`];
  amount: ConsumerCreatePaymentRequestPayload[`amount`];
  currencyCode: string;
  description?: string;
  dueDate?: string;
  contractId?: string;
  returnTo?: string;
}): Promise<PaymentRequestCreateResult> {
  const email = input.email.trim().toLowerCase();
  const amount = parseMajorAmountInput(input.amount);
  const currencyCode = input.currencyCode.trim().toUpperCase();
  const description = input.description?.trim();
  const dueDate = input.dueDate?.trim();

  if (!isValidEmail(email)) {
    return invalid(`Please enter a valid recipient email`, { email: `Enter a valid email address` });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return invalid(`Please enter a valid amount`, { amount: `Amount must be greater than zero` });
  }
  if (!currencyCode || currencyCode.length !== 3) {
    return invalid(`Please choose a valid currency`, { currencyCode: `Choose a 3-letter currency code` });
  }
  if (dueDate) {
    const normalizedDueDate = normalizeDateInput(dueDate);
    if (!normalizedDueDate) {
      return invalid(`Please choose a valid due date`, { dueDate: `Choose a valid date` });
    }
    if (!isDateInputTodayOrLater(normalizedDueDate)) {
      return invalid(`Due date must be today or in the future`, { dueDate: `Choose today or a future date` });
    }
  }

  const baseUrl = configuredBaseUrl();
  if (!baseUrl) {
    return {
      ok: false,
      error: { code: `CONFIG_ERROR`, message: `API base URL is not configured` },
    };
  }

  const response = await fetch(`${baseUrl}/consumer/payment-requests`, {
    method: `POST`,
    headers: {
      'content-type': `application/json`,
      ...(await consumerMutationHeaders()),
    },
    body: JSON.stringify({
      email,
      amount: String(amount),
      currencyCode,
      ...(description ? { description } : {}),
      ...(dueDate ? { dueDate } : {}),
    }),
    cache: `no-store`,
  });

  if (!response.ok) {
    const error = await parseError(response, `Failed to create payment request`);
    return { ok: false, error };
  }

  const payload = (await response.json().catch(() => null)) as ConsumerCreatePaymentRequestResponse | null;
  revalidatePath(`/payments`);
  revalidatePath(`/dashboard`);
  revalidateContractPaths(input);
  return {
    ok: true,
    paymentRequestId: payload?.paymentRequestId,
    message: `Payment request created`,
  };
}

export async function startPaymentMutation(input: {
  email: ConsumerStartPaymentPayload[`email`];
  amount: ConsumerStartPaymentPayload[`amount`];
  currencyCode: string;
  description?: string;
  method: ConsumerStartPaymentPayload[`method`];
  contractId?: string;
  returnTo?: string;
}): Promise<StartPaymentResult> {
  const email = input.email.trim().toLowerCase();
  const amount = parseMajorAmountInput(input.amount);
  const currencyCode = input.currencyCode.trim().toUpperCase();
  const description = input.description?.trim();

  if (!isValidEmail(email)) {
    return {
      ok: false,
      error: {
        code: `VALIDATION_ERROR`,
        message: `Please enter a valid recipient email`,
        fields: { email: `Enter a valid email address` },
      },
    };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      ok: false,
      error: {
        code: `VALIDATION_ERROR`,
        message: `Please enter a valid amount`,
        fields: { amount: `Amount must be greater than zero` },
      },
    };
  }
  if (!currencyCode || currencyCode.length !== 3) {
    return {
      ok: false,
      error: {
        code: `VALIDATION_ERROR`,
        message: `Please choose a valid currency`,
        fields: { currencyCode: `Choose a 3-letter currency code` },
      },
    };
  }

  const baseUrl = configuredBaseUrl();
  if (!baseUrl) {
    return {
      ok: false,
      error: { code: `CONFIG_ERROR`, message: `API base URL is not configured` },
    };
  }

  const startUrl = new URL(`${baseUrl}/consumer/payments/start`);
  startUrl.searchParams.set(`appScope`, APP_SCOPE);
  const response = await fetch(startUrl, {
    method: `POST`,
    headers: {
      'content-type': `application/json`,
      ...(await consumerMutationHeaders()),
    },
    body: JSON.stringify({
      email,
      amount: String(amount),
      currencyCode,
      method: input.method,
      ...(description ? { description } : {}),
    }),
    cache: `no-store`,
  });

  if (!response.ok) {
    const error = await parseError(response, `Failed to start payment`);
    return { ok: false, error };
  }

  const payload = (await response.json().catch(() => null)) as ConsumerStartPaymentResponse | null;
  revalidatePath(`/payments`);
  revalidatePath(`/dashboard`);
  revalidateContractPaths(input);
  return {
    ok: true,
    paymentRequestId: payload?.paymentRequestId,
    ledgerId: payload?.ledgerId,
    message: `Payment created`,
  };
}

export async function sendPaymentRequestMutation(
  paymentRequestId: string,
  context?: PaymentFlowMutationContext | null,
): Promise<MutationResult> {
  const id = paymentRequestId.trim();
  if (!id) return invalid(`Invalid payment request id`);

  const baseUrl = configuredBaseUrl();
  if (!baseUrl) {
    return {
      ok: false,
      error: { code: `CONFIG_ERROR`, message: `API base URL is not configured` },
    };
  }

  const sendUrl = new URL(`${baseUrl}/consumer/payment-requests/${id}/send`);
  sendUrl.searchParams.set(`appScope`, APP_SCOPE);
  const response = await fetch(sendUrl, {
    method: `POST`,
    headers: {
      ...(await consumerMutationHeaders()),
    },
    cache: `no-store`,
  });

  if (!response.ok) {
    const error = await parseError(response, `Failed to send payment request`);
    return { ok: false, error };
  }

  revalidatePath(`/payments`);
  revalidatePath(`/payments/${id}`);
  revalidatePath(`/dashboard`);
  revalidateContractPaths(context);
  return { ok: true, message: `Payment request sent` };
}

export async function attachDocumentsToPaymentRequestMutation(
  paymentRequestId: string,
  documentIds: string[],
): Promise<MutationResult> {
  const id = paymentRequestId.trim();
  const resourceIds = Array.from(new Set(documentIds.map((documentId) => documentId.trim()).filter(Boolean)));

  if (!id) return invalid(`Invalid payment request id`);
  if (resourceIds.length === 0) {
    return invalid(`Please choose at least one document`, { documentIds: `Select one or more documents` });
  }

  const baseUrl = configuredBaseUrl();
  if (!baseUrl) {
    return {
      ok: false,
      error: { code: `CONFIG_ERROR`, message: `API base URL is not configured` },
    };
  }

  const response = await fetch(`${baseUrl}/consumer/documents/attach-to-payment`, {
    method: `POST`,
    headers: {
      'content-type': `application/json`,
      ...(await consumerMutationHeaders()),
    },
    body: JSON.stringify({
      paymentRequestId: id,
      resourceIds,
    }),
    cache: `no-store`,
  });

  if (!response.ok) {
    const error = await parseError(response, `Failed to attach documents to the payment request`);
    return { ok: false, error };
  }

  revalidatePath(`/payments/${id}`);
  revalidatePath(`/payments`);
  revalidatePath(`/documents`);
  return {
    ok: true,
    message: resourceIds.length === 1 ? `Document attached` : `Documents attached`,
  };
}

export async function getDraftPaymentRequestsAction(input?: {
  page?: number;
  pageSize?: number;
}): Promise<DraftPaymentRequestsResult> {
  const baseUrl = configuredBaseUrl();
  if (!baseUrl) {
    return {
      ok: false,
      error: { code: `CONFIG_ERROR`, message: `API base URL is not configured` },
    };
  }

  const safePage = Math.max(1, Math.floor(Number(input?.page)) || 1);
  const safePageSize = Math.min(100, Math.max(1, Math.floor(Number(input?.pageSize)) || 20));
  const searchParams = new URLSearchParams({
    page: String(safePage),
    pageSize: String(safePageSize),
    status: `DRAFT`,
    role: `REQUESTER`,
  });
  const response = await fetch(`${baseUrl}/consumer/payments?${searchParams.toString()}`, {
    method: `GET`,
    headers: await consumerMutationHeaders(),
    cache: `no-store`,
  });

  if (!response.ok) {
    return {
      ok: false,
      error: await parseError(response, `Failed to load draft payment requests`),
    };
  }

  const payload = (await response.json().catch(() => null)) as ConsumerPaymentsResponse | null;
  const items = Array.isArray(payload?.items) ? payload.items : [];

  return {
    ok: true,
    items: items.map((payment) => ({
      id: payment.id,
      amount: payment.amount,
      currencyCode: payment.currencyCode,
      createdAt: payment.createdAt,
      description: payment.description ?? null,
      counterpartyEmail: payment.counterparty?.email ?? null,
    })),
    total: typeof payload?.total === `number` ? payload.total : items.length,
    page: typeof payload?.page === `number` ? payload.page : safePage,
    pageSize: typeof payload?.pageSize === `number` ? payload.pageSize : safePageSize,
  };
}

export async function attachDocumentToDraftPaymentRequestsMutation(
  paymentRequestIds: string[],
  documentId: string,
): Promise<AttachDocumentToDraftPaymentsResult> {
  const normalizedDocumentId = documentId.trim();
  const normalizedPaymentRequestIds = Array.from(
    new Set(paymentRequestIds.map((paymentRequestId) => paymentRequestId.trim()).filter(Boolean)),
  );

  if (!normalizedDocumentId) {
    return {
      ok: false,
      attachedCount: 0,
      error: { code: `VALIDATION_ERROR`, message: `Invalid document id` },
    };
  }
  if (normalizedPaymentRequestIds.length === 0) {
    return {
      ok: false,
      attachedCount: 0,
      error: {
        code: `VALIDATION_ERROR`,
        message: `Please choose at least one draft payment request`,
        fields: { paymentRequestIds: `Select one or more draft payment requests` },
      },
    };
  }

  let attachedCount = 0;
  for (const paymentRequestId of normalizedPaymentRequestIds) {
    const result = await attachDocumentsToPaymentRequestMutation(paymentRequestId, [normalizedDocumentId]);
    if (!result.ok) {
      if (attachedCount > 0) {
        return {
          ok: false,
          attachedCount,
          error: {
            ...result.error,
            message:
              `Document attached to ${attachedCount} draft payment request${attachedCount === 1 ? `` : `s`} ` +
              `before the operation stopped. ${result.error.message}`,
          },
        };
      }
      return {
        ok: false,
        attachedCount: 0,
        error: result.error,
      };
    }
    attachedCount += 1;
  }

  return {
    ok: true,
    attachedCount,
    message:
      attachedCount === 1
        ? `Document attached to draft payment request.`
        : `Document attached to ${attachedCount} draft payment requests.`,
  };
}

export async function detachDocumentFromPaymentRequestMutation(
  paymentRequestId: string,
  resourceId: string,
): Promise<MutationResult> {
  const id = paymentRequestId.trim();
  const normalizedResourceId = resourceId.trim();

  if (!id) return invalid(`Invalid payment request id`);
  if (!normalizedResourceId) return invalid(`Invalid document id`);

  const baseUrl = configuredBaseUrl();
  if (!baseUrl) {
    return {
      ok: false,
      error: { code: `CONFIG_ERROR`, message: `API base URL is not configured` },
    };
  }

  const response = await fetch(`${baseUrl}/consumer/documents/payment-attachments/${id}/${normalizedResourceId}`, {
    method: `DELETE`,
    headers: {
      ...(await consumerMutationHeaders()),
    },
    cache: `no-store`,
  });

  if (!response.ok) {
    const error = await parseError(response, `Failed to remove attachment from the payment request`);
    return { ok: false, error };
  }

  revalidatePath(`/payments/${id}`);
  revalidatePath(`/payments`);
  revalidatePath(`/documents`);
  return { ok: true, message: `Attachment removed from draft` };
}
