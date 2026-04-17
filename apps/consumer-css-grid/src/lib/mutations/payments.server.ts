'use server';

import { randomUUID } from 'crypto';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

import { sanitizeNextForRedirect } from '@remoola/api-types';

import { SESSION_EXPIRED_ERROR_CODE } from '../auth-failure';
import { type PaymentsResponse } from '../consumer-api.server';
import { buildConsumerMutationHeaders } from '../consumer-auth-headers.server';
import { isDateInputTodayOrLater, normalizeDateInput } from '../date-input';
import { normalizeDocumentDownloadUrl } from '../document-download-url';
import { getEnv } from '../env.server';

type MutationResult =
  | { ok: true; message?: string }
  | { ok: false; error: { code: string; message: string; fields?: Record<string, string> } };

type PaymentRequestCreateResult =
  | { ok: true; paymentRequestId?: string; message?: string }
  | { ok: false; error: { code: string; message: string; fields?: Record<string, string> } };

type StartPaymentResult =
  | { ok: true; paymentRequestId?: string; ledgerId?: string; message?: string }
  | { ok: false; error: { code: string; message: string; fields?: Record<string, string> } };

type TransferResult =
  | { ok: true; ledgerId?: string; message?: string }
  | { ok: false; error: { code: string; message: string; fields?: Record<string, string> } };

type SavedMethodPaymentResult =
  | {
      ok: true;
      data: {
        success: boolean;
        paymentIntentId?: string;
        status?: string;
        nextAction?: unknown;
      };
    }
  | { ok: false; error: { code: string; message: string; fields?: Record<string, string> } };

type CheckoutSessionResult =
  | {
      ok: true;
      data: {
        url?: string;
      };
    }
  | { ok: false; error: { code: string; message: string; fields?: Record<string, string> } };

type InvoiceGenerationResult =
  | {
      ok: true;
      data: {
        invoiceNumber?: string;
        resourceId?: string;
        downloadUrl?: string;
      };
      message?: string;
    }
  | { ok: false; error: { code: string; message: string; fields?: Record<string, string> } };

type VerificationSessionResult =
  | {
      ok: true;
      data: {
        clientSecret?: string;
        sessionId?: string;
        url?: string;
      };
    }
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

type AttachDocumentToDraftPaymentsResult =
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

const APP_SCOPE = `consumer-css-grid`;
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

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function parseMajorAmountInput(value: string): number {
  const trimmed = value.trim();
  if (!/^\d+(?:\.\d+)?$/.test(trimmed)) return Number.NaN;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

type PaymentFlowMutationContext = {
  contractId?: string | null;
  returnTo?: string | null;
};

function normalizePaymentFlowMutationContext(input?: PaymentFlowMutationContext | null) {
  const contractId = input?.contractId?.trim() ?? ``;
  const returnTo = sanitizeNextForRedirect(input?.returnTo, ``);

  if (!contractId && !returnTo) {
    return null;
  }

  return {
    ...(contractId ? { contractId } : {}),
    ...(returnTo ? { returnTo } : contractId ? { returnTo: `/contracts/${contractId}` } : {}),
  };
}

function revalidateContractPaths(context?: PaymentFlowMutationContext | null) {
  const normalized = normalizePaymentFlowMutationContext(context);
  if (!normalized?.contractId) return;
  revalidatePath(`/contracts`);
  revalidatePath(`/contracts/${normalized.contractId}`);
}

export async function createPaymentRequestMutation(input: {
  email: string;
  amount: string;
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

  const cookieStore = await cookies();
  const response = await fetch(`${baseUrl}/consumer/payment-requests`, {
    method: `POST`,
    headers: {
      'content-type': `application/json`,
      ...buildConsumerMutationHeaders(cookieStore.toString()),
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

  const payload = (await response.json().catch(() => null)) as { paymentRequestId?: string } | null;
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
  email: string;
  amount: string;
  currencyCode: string;
  description?: string;
  method: `CREDIT_CARD` | `BANK_ACCOUNT`;
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

  const cookieStore = await cookies();
  const startUrl = new URL(`${baseUrl}/consumer/payments/start`);
  startUrl.searchParams.set(`appScope`, APP_SCOPE);
  const response = await fetch(startUrl, {
    method: `POST`,
    headers: {
      'content-type': `application/json`,
      ...buildConsumerMutationHeaders(cookieStore.toString()),
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

  const payload = (await response.json().catch(() => null)) as {
    paymentRequestId?: string;
    ledgerId?: string;
  } | null;
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

  const cookieStore = await cookies();
  const sendUrl = new URL(`${baseUrl}/consumer/payment-requests/${id}/send`);
  sendUrl.searchParams.set(`appScope`, APP_SCOPE);
  const response = await fetch(sendUrl, {
    method: `POST`,
    headers: {
      ...buildConsumerMutationHeaders(cookieStore.toString()),
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

  const cookieStore = await cookies();
  const response = await fetch(`${baseUrl}/consumer/documents/attach-to-payment`, {
    method: `POST`,
    headers: {
      'content-type': `application/json`,
      ...buildConsumerMutationHeaders(cookieStore.toString()),
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

  const cookieStore = await cookies();
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
    headers: buildConsumerMutationHeaders(cookieStore.toString()),
    cache: `no-store`,
  });

  if (!response.ok) {
    return {
      ok: false,
      error: await parseError(response, `Failed to load draft payment requests`),
    };
  }

  const payload = (await response.json().catch(() => null)) as PaymentsResponse | null;
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

  const cookieStore = await cookies();
  const response = await fetch(`${baseUrl}/consumer/documents/payment-attachments/${id}/${normalizedResourceId}`, {
    method: `DELETE`,
    headers: {
      ...buildConsumerMutationHeaders(cookieStore.toString()),
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

export async function payWithSavedMethodMutation(
  paymentRequestId: string,
  paymentMethodId: string,
  context?: PaymentFlowMutationContext | null,
): Promise<SavedMethodPaymentResult> {
  const id = paymentRequestId.trim();
  const methodId = paymentMethodId.trim();
  if (!id) {
    return {
      ok: false,
      error: { code: `VALIDATION_ERROR`, message: `Invalid payment request id` },
    };
  }
  if (!methodId) {
    return {
      ok: false,
      error: {
        code: `VALIDATION_ERROR`,
        message: `Please choose a saved card`,
        fields: { paymentMethodId: `Select a saved card` },
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

  const cookieStore = await cookies();
  const savedMethodUrl = new URL(`${baseUrl}/consumer/stripe/${id}/pay-with-saved-method`);
  savedMethodUrl.searchParams.set(`appScope`, APP_SCOPE);
  const response = await fetch(savedMethodUrl, {
    method: `POST`,
    headers: {
      'content-type': `application/json`,
      ...buildConsumerMutationHeaders(cookieStore.toString()),
      'idempotency-key': randomUUID(),
    },
    body: JSON.stringify({ paymentMethodId: methodId }),
    cache: `no-store`,
  });

  if (!response.ok) {
    const error = await parseError(response, `Failed to process payment with the saved method`);
    return { ok: false, error };
  }

  const payload = (await response.json().catch(() => null)) as {
    success?: boolean;
    paymentIntentId?: string;
    status?: string;
    nextAction?: unknown;
  } | null;

  if (payload?.success) {
    revalidatePath(`/payments`);
    revalidatePath(`/payments/${id}`);
    revalidatePath(`/dashboard`);
    revalidateContractPaths(context);
  }

  return {
    ok: true,
    data: {
      success: payload?.success === true,
      paymentIntentId: payload?.paymentIntentId,
      status: payload?.status,
      nextAction: payload?.nextAction,
    },
  };
}

export async function createPaymentCheckoutSessionMutation(
  paymentRequestId: string,
  context?: PaymentFlowMutationContext | null,
): Promise<CheckoutSessionResult> {
  const id = paymentRequestId.trim();
  if (!id) {
    return {
      ok: false,
      error: { code: `VALIDATION_ERROR`, message: `Invalid payment request id` },
    };
  }

  const baseUrl = configuredBaseUrl();
  if (!baseUrl) {
    return {
      ok: false,
      error: { code: `CONFIG_ERROR`, message: `API base URL is not configured` },
    };
  }

  const cookieStore = await cookies();
  const checkoutUrl = new URL(`${baseUrl}/consumer/stripe/${id}/stripe-session`);
  checkoutUrl.searchParams.set(`appScope`, APP_SCOPE);
  const paymentFlowContext = normalizePaymentFlowMutationContext(context);
  if (paymentFlowContext?.contractId) {
    checkoutUrl.searchParams.set(`contractId`, paymentFlowContext.contractId);
  }
  if (paymentFlowContext?.returnTo) {
    checkoutUrl.searchParams.set(`returnTo`, paymentFlowContext.returnTo);
  }
  const response = await fetch(checkoutUrl, {
    method: `POST`,
    headers: {
      ...buildConsumerMutationHeaders(cookieStore.toString()),
    },
    cache: `no-store`,
  });

  if (!response.ok) {
    const error = await parseError(response, `Failed to start checkout`);
    return { ok: false, error };
  }

  const payload = (await response.json().catch(() => null)) as { url?: string } | null;
  return {
    ok: true,
    data: {
      url: payload?.url,
    },
  };
}

export async function generateInvoiceMutation(
  paymentRequestId: string,
  context?: PaymentFlowMutationContext | null,
): Promise<InvoiceGenerationResult> {
  const id = paymentRequestId.trim();
  if (!id) {
    return {
      ok: false,
      error: { code: `VALIDATION_ERROR`, message: `Invalid payment request id` },
    };
  }

  const baseUrl = configuredBaseUrl();
  if (!baseUrl) {
    return {
      ok: false,
      error: { code: `CONFIG_ERROR`, message: `API base URL is not configured` },
    };
  }

  const cookieStore = await cookies();
  const response = await fetch(`${baseUrl}/consumer/payments/${id}/generate-invoice`, {
    method: `POST`,
    headers: {
      ...buildConsumerMutationHeaders(cookieStore.toString()),
    },
    cache: `no-store`,
  });

  if (!response.ok) {
    const error = await parseError(response, `Failed to generate invoice`);
    return { ok: false, error };
  }

  const payload = (await response.json().catch(() => null)) as {
    invoiceNumber?: string;
    resourceId?: string;
    downloadUrl?: string;
  } | null;

  revalidatePath(`/payments/${id}`);
  revalidatePath(`/payments`);
  revalidatePath(`/documents`);
  revalidateContractPaths(context);

  return {
    ok: true,
    data: {
      invoiceNumber: payload?.invoiceNumber,
      resourceId: payload?.resourceId,
      downloadUrl: normalizeDocumentDownloadUrl(payload?.downloadUrl, payload?.resourceId),
    },
    message: payload?.invoiceNumber ? `Invoice ${payload.invoiceNumber} is ready` : `Invoice is ready`,
  };
}

export async function startVerificationSessionMutation(): Promise<VerificationSessionResult> {
  const baseUrl = configuredBaseUrl();
  if (!baseUrl) {
    return {
      ok: false,
      error: { code: `CONFIG_ERROR`, message: `API base URL is not configured` },
    };
  }

  const cookieStore = await cookies();
  const response = await fetch(`${baseUrl}/consumer/verification/sessions`, {
    method: `POST`,
    headers: {
      ...buildConsumerMutationHeaders(cookieStore.toString()),
    },
    cache: `no-store`,
  });

  if (!response.ok) {
    const error = await parseError(response, `Failed to start verification`);
    return { ok: false, error };
  }

  const payload = (await response.json().catch(() => null)) as {
    clientSecret?: string;
    sessionId?: string;
    url?: string;
  } | null;

  revalidatePath(`/dashboard`);
  revalidatePath(`/settings`);
  return {
    ok: true,
    data: {
      clientSecret: payload?.clientSecret,
      sessionId: payload?.sessionId,
      url: payload?.url,
    },
  };
}

export async function submitWithdrawAction(input: {
  amount: string;
  currency: string;
  paymentMethodId: string;
  note?: string;
}): Promise<MutationResult> {
  const amount = parseMajorAmountInput(input.amount);
  const currency = input.currency.trim().toUpperCase();
  const paymentMethodId = input.paymentMethodId.trim();
  const note = input.note?.trim();

  if (!Number.isFinite(amount) || amount <= 0) {
    return invalid(`Please enter a valid amount`, { amount: `Amount must be positive` });
  }
  if (!currency) {
    return invalid(`Please select a currency`, { currency: `Currency is required` });
  }
  if (!paymentMethodId) {
    return invalid(`Please select a payout destination`, { paymentMethodId: `Bank account is required` });
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
  const idempotencyKey = randomUUID();
  const response = await fetch(`${baseUrl}/consumer/payments/withdraw`, {
    method: `POST`,
    headers: {
      'content-type': `application/json`,
      ...buildConsumerMutationHeaders(cookieStore.toString()),
      'x-correlation-id': randomUUID(),
      'idempotency-key': idempotencyKey,
    },
    body: JSON.stringify({
      amount,
      currency,
      paymentMethodId,
      ...(note ? { note } : {}),
    }),
    cache: `no-store`,
  });

  if (!response.ok) {
    const error = await parseError(response, `Withdrawal could not be completed`);
    return { ok: false, error };
  }

  revalidatePath(`/withdraw`);
  revalidatePath(`/payments`);
  revalidatePath(`/dashboard`);
  return { ok: true, message: `Withdrawal initiated successfully` };
}

export async function submitTransferAction(input: {
  amount: string;
  currency: string;
  recipient: string;
  note?: string;
}): Promise<TransferResult> {
  const amount = parseMajorAmountInput(input.amount);
  const currency = input.currency.trim().toUpperCase();
  const recipient = input.recipient.trim();
  const note = input.note?.trim();

  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      ok: false,
      error: {
        code: `VALIDATION_ERROR`,
        message: `Please enter a valid amount`,
        fields: { amount: `Amount must be positive` },
      },
    };
  }
  if (!currency) {
    return {
      ok: false,
      error: {
        code: `VALIDATION_ERROR`,
        message: `Please select a currency`,
        fields: { currency: `Currency is required` },
      },
    };
  }
  if (!recipient) {
    return {
      ok: false,
      error: {
        code: `VALIDATION_ERROR`,
        message: `Please enter the recipient email or phone number`,
        fields: { recipient: `Recipient email or phone is required` },
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

  try {
    const cookieStore = await cookies();
    const idempotencyKey = randomUUID();
    const response = await fetch(`${baseUrl}/consumer/payments/transfer`, {
      method: `POST`,
      headers: {
        'content-type': `application/json`,
        ...buildConsumerMutationHeaders(cookieStore.toString()),
        'x-correlation-id': randomUUID(),
        'idempotency-key': idempotencyKey,
      },
      body: JSON.stringify({
        amount,
        currency,
        recipient,
        ...(note ? { note } : {}),
      }),
      cache: `no-store`,
    });

    if (!response.ok) {
      const error = await parseError(response, `Transfer could not be completed`);
      return { ok: false, error };
    }

    const payload = (await response.json().catch(() => null)) as { ledgerId?: string } | null;
    revalidatePath(`/withdraw`);
    revalidatePath(`/payments`);
    revalidatePath(`/dashboard`);
    return {
      ok: true,
      ledgerId: payload?.ledgerId,
      message: `Transfer completed successfully`,
    };
  } catch {
    return {
      ok: false,
      error: {
        code: `NETWORK_ERROR`,
        message: `Transfer could not be completed because the network request failed`,
      },
    };
  }
}
