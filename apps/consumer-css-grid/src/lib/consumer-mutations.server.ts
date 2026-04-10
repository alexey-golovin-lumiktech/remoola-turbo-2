'use server';

import { randomUUID } from 'crypto';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

import { sanitizeNextForRedirect, type TTheme } from '@remoola/api-types';

import { SESSION_EXPIRED_ERROR_CODE } from './auth-failure';
import {
  findContactByExactEmail,
  getExchangeRatesBatch,
  type ExchangeRatesBatchResult,
  type PaymentsResponse,
} from './consumer-api.server';
import { buildConsumerMutationHeaders } from './consumer-auth-headers.server';
import { isDateInputTodayOrLater, normalizeDateInput } from './date-input';
import { normalizeDocumentDownloadUrl } from './document-download-url';
import { getEnv } from './env.server';

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

type QuoteResult =
  | {
      ok: true;
      data: {
        from: string;
        to: string;
        rate: number;
        sourceAmount: number;
        targetAmount: number;
      };
    }
  | { ok: false; error: { code: string; message: string; fields?: Record<string, string> } };

type ExchangeRatesRefreshResult =
  | {
      ok: true;
      data: ExchangeRatesBatchResult;
    }
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

type StripeSetupIntentResult =
  | {
      ok: true;
      data: {
        clientSecret: string;
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

function normalizePhone(value: string) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, ``).slice(0, 15);
  if (!digits) return ``;
  return trimmed.startsWith(`+`) ? `+${digits}` : digits;
}

function hasOwn<T extends object>(value: T, key: keyof T) {
  return Object.prototype.hasOwnProperty.call(value, key);
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

export async function createContactMutation(input: {
  email: string;
  name?: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}): Promise<MutationResult> {
  const email = input.email.trim().toLowerCase();
  const name = input.name?.trim() || null;
  const address = {
    street: input.street?.trim() || ``,
    city: input.city?.trim() || ``,
    state: input.state?.trim() || ``,
    postalCode: input.postalCode?.trim() || ``,
    country: input.country?.trim() || ``,
  };
  const hasAddress = Object.values(address).some(Boolean);

  if (!email || !email.includes(`@`)) {
    return invalid(`Please enter a valid email address`, { email: `Valid email is required` });
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
  const response = await fetch(`${baseUrl}/consumer/contacts`, {
    method: `POST`,
    headers: {
      'content-type': `application/json`,
      ...buildConsumerMutationHeaders(cookieStore.toString()),
    },
    body: JSON.stringify({
      email,
      ...(name ? { name } : {}),
      ...(hasAddress ? { address } : {}),
    }),
    cache: `no-store`,
  });

  if (!response.ok) {
    const error = await parseError(response, `Failed to create contact`);
    return { ok: false, error };
  }

  revalidatePath(`/contacts`);
  revalidatePath(`/contracts`);
  return { ok: true, message: `Contact created` };
}

export async function hasSavedContactByEmailQuery(
  email: string,
): Promise<{ ok: true; found: boolean } | { ok: false; error: { code: string; message: string } }> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes(`@`)) {
    return {
      ok: false,
      error: {
        code: `VALIDATION_ERROR`,
        message: `Please enter a valid email address`,
      },
    };
  }

  try {
    const match = await findContactByExactEmail(normalizedEmail);
    return {
      ok: true,
      found: match?.email?.trim().toLowerCase() === normalizedEmail,
    };
  } catch {
    return {
      ok: false,
      error: {
        code: `NETWORK_ERROR`,
        message: `Could not verify saved contacts right now`,
      },
    };
  }
}

export async function deleteContactMutation(contactId: string): Promise<MutationResult> {
  if (!contactId.trim()) {
    return invalid(`Invalid contact id`);
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
  const response = await fetch(`${baseUrl}/consumer/contacts/${contactId}`, {
    method: `DELETE`,
    headers: {
      ...buildConsumerMutationHeaders(cookieStore.toString()),
    },
    cache: `no-store`,
  });

  if (!response.ok) {
    const error = await parseError(response, `Failed to delete contact`);
    return { ok: false, error };
  }

  revalidatePath(`/contacts`);
  revalidatePath(`/contracts`);
  return { ok: true, message: `Contact deleted` };
}

export async function updateContactMutation(
  contactId: string,
  input: {
    email: string;
    name?: string;
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  },
): Promise<MutationResult> {
  if (!contactId.trim()) {
    return invalid(`Invalid contact id`);
  }

  const email = input.email.trim().toLowerCase();
  const name = input.name?.trim() || null;
  const address = {
    street: input.street?.trim() || ``,
    city: input.city?.trim() || ``,
    state: input.state?.trim() || ``,
    postalCode: input.postalCode?.trim() || ``,
    country: input.country?.trim() || ``,
  };
  const hasAddress = Object.values(address).some(Boolean);

  if (!email || !email.includes(`@`)) {
    return invalid(`Please enter a valid email address`, { email: `Valid email is required` });
  }

  const baseUrl = configuredBaseUrl();
  if (!baseUrl) {
    return {
      ok: false,
      error: { code: `CONFIG_ERROR`, message: `API base URL is not configured` },
    };
  }

  const cookieStore = await cookies();
  const response = await fetch(`${baseUrl}/consumer/contacts/${contactId}`, {
    method: `PATCH`,
    headers: {
      'content-type': `application/json`,
      ...buildConsumerMutationHeaders(cookieStore.toString()),
    },
    body: JSON.stringify({
      email,
      ...(name ? { name } : {}),
      address: hasAddress ? address : null,
    }),
    cache: `no-store`,
  });

  if (!response.ok) {
    const error = await parseError(response, `Failed to update contact`);
    return { ok: false, error };
  }

  revalidatePath(`/contacts`);
  revalidatePath(`/contracts`);
  return { ok: true, message: `Contact updated` };
}

export async function updateProfileMutation(input: {
  personalDetails?: {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
  };
  addressDetails?: {
    country?: string;
    city?: string;
    street?: string;
    postalCode?: string;
  };
  organizationDetails?: {
    name?: string;
  };
}): Promise<MutationResult> {
  const personalDetailsInput = input.personalDetails;
  const personalDetails = personalDetailsInput
    ? {
        ...(hasOwn(personalDetailsInput, `firstName`)
          ? { firstName: personalDetailsInput.firstName?.trim() ?? `` }
          : {}),
        ...(hasOwn(personalDetailsInput, `lastName`) ? { lastName: personalDetailsInput.lastName?.trim() ?? `` } : {}),
        ...(hasOwn(personalDetailsInput, `phoneNumber`)
          ? { phoneNumber: normalizePhone(personalDetailsInput.phoneNumber ?? ``) }
          : {}),
      }
    : undefined;
  const addressDetailsInput = input.addressDetails;
  const addressDetails = addressDetailsInput
    ? {
        ...(hasOwn(addressDetailsInput, `country`) ? { country: addressDetailsInput.country?.trim() ?? `` } : {}),
        ...(hasOwn(addressDetailsInput, `city`) ? { city: addressDetailsInput.city?.trim() ?? `` } : {}),
        ...(hasOwn(addressDetailsInput, `street`) ? { street: addressDetailsInput.street?.trim() ?? `` } : {}),
        ...(hasOwn(addressDetailsInput, `postalCode`)
          ? { postalCode: addressDetailsInput.postalCode?.trim() ?? `` }
          : {}),
      }
    : undefined;
  const organizationDetailsInput = input.organizationDetails;
  const organizationDetails = organizationDetailsInput
    ? {
        ...(hasOwn(organizationDetailsInput, `name`) ? { name: organizationDetailsInput.name?.trim() ?? `` } : {}),
      }
    : undefined;

  if (!personalDetails || Object.keys(personalDetails).length === 0) {
    if (
      (!addressDetails || Object.keys(addressDetails).length === 0) &&
      (!organizationDetails || Object.keys(organizationDetails).length === 0)
    ) {
      return invalid(`Please change at least one profile field before saving`);
    }
  }

  const baseUrl = configuredBaseUrl();
  if (!baseUrl) {
    return {
      ok: false,
      error: { code: `CONFIG_ERROR`, message: `API base URL is not configured` },
    };
  }

  const body = {
    ...(personalDetails && Object.keys(personalDetails).length > 0 ? { personalDetails } : {}),
    ...(addressDetails && Object.keys(addressDetails).length > 0 ? { addressDetails } : {}),
    ...(organizationDetails && Object.keys(organizationDetails).length > 0 ? { organizationDetails } : {}),
  };

  const cookieStore = await cookies();
  const response = await fetch(`${baseUrl}/consumer/profile`, {
    method: `PATCH`,
    headers: {
      'content-type': `application/json`,
      ...buildConsumerMutationHeaders(cookieStore.toString()),
    },
    body: JSON.stringify(body),
    cache: `no-store`,
  });

  if (!response.ok) {
    const error = await parseError(response, `Failed to update profile`);
    return { ok: false, error };
  }

  revalidatePath(`/settings`);
  return { ok: true, message: `Profile updated` };
}

export async function updateSettingsMutation(input: {
  theme?: TTheme;
  preferredCurrency?: string;
}): Promise<MutationResult> {
  const theme = input.theme?.trim().toUpperCase();
  const preferredCurrency = input.preferredCurrency?.trim().toUpperCase();

  if (!theme && !preferredCurrency) {
    return invalid(`Please change at least one preference before saving`);
  }

  const baseUrl = configuredBaseUrl();
  if (!baseUrl) {
    return {
      ok: false,
      error: { code: `CONFIG_ERROR`, message: `API base URL is not configured` },
    };
  }

  const cookieStore = await cookies();
  const response = await fetch(`${baseUrl}/consumer/settings`, {
    method: `PATCH`,
    headers: {
      'content-type': `application/json`,
      ...buildConsumerMutationHeaders(cookieStore.toString()),
    },
    body: JSON.stringify({
      ...(theme ? { theme } : {}),
      ...(preferredCurrency ? { preferredCurrency } : {}),
    }),
    cache: `no-store`,
  });

  if (!response.ok) {
    const error = await parseError(response, `Failed to update settings`);
    return { ok: false, error };
  }

  revalidatePath(`/settings`);
  return { ok: true, message: `Preferences updated` };
}

export async function changePasswordMutation(input: {
  currentPassword?: string;
  password: string;
  confirmPassword: string;
}): Promise<MutationResult> {
  const currentPassword = input.currentPassword?.trim();
  const password = input.password;
  const confirmPassword = input.confirmPassword;

  if (password.length < 8) {
    return invalid(`New password must be at least 8 characters`, {
      password: `Use at least 8 characters`,
    });
  }
  if (password !== confirmPassword) {
    return invalid(`New password and confirmation do not match`, {
      confirmPassword: `Passwords must match`,
    });
  }
  if (currentPassword && currentPassword === password) {
    return invalid(`New password must be different from the current password`, {
      password: `Choose a different password`,
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
  const response = await fetch(`${baseUrl}/consumer/profile/password`, {
    method: `PATCH`,
    headers: {
      'content-type': `application/json`,
      ...buildConsumerMutationHeaders(cookieStore.toString()),
    },
    body: JSON.stringify({
      ...(currentPassword ? { currentPassword } : {}),
      password,
    }),
    cache: `no-store`,
  });

  if (!response.ok) {
    const error = await parseError(response, `Failed to update password`);
    return { ok: false, error };
  }

  return { ok: true, message: `Password updated. Please sign in again.` };
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

export async function addBankAccountMutation(input: {
  bankName: string;
  last4: string;
  billingName: string;
  billingEmail?: string;
  billingPhone?: string;
  defaultSelected?: boolean;
}): Promise<MutationResult> {
  const bankName = input.bankName.trim();
  const last4 = input.last4.trim();
  const billingName = input.billingName.trim();
  const billingEmail = input.billingEmail?.trim().toLowerCase();
  const billingPhone = normalizePhone(input.billingPhone ?? ``);

  if (!bankName) return invalid(`Please enter a bank name`, { bankName: `Bank name is required` });
  if (!/^\d{4}$/.test(last4)) return invalid(`Last 4 digits are required`, { last4: `Enter exactly 4 digits` });
  if (!billingName) return invalid(`Billing name is required`, { billingName: `Billing name is required` });
  if (billingEmail && !isValidEmail(billingEmail)) {
    return invalid(`Please enter a valid billing email`, { billingEmail: `Enter a valid email address` });
  }
  if (billingPhone && billingPhone.replace(/\D/g, ``).length < 7) {
    return invalid(`Please enter a valid billing phone`, { billingPhone: `Enter at least 7 digits` });
  }

  const baseUrl = configuredBaseUrl();
  if (!baseUrl) {
    return { ok: false, error: { code: `CONFIG_ERROR`, message: `API base URL is not configured` } };
  }

  const cookieStore = await cookies();
  const response = await fetch(`${baseUrl}/consumer/payment-methods`, {
    method: `POST`,
    headers: {
      'content-type': `application/json`,
      ...buildConsumerMutationHeaders(cookieStore.toString()),
      'x-correlation-id': randomUUID(),
    },
    body: JSON.stringify({
      type: `BANK_ACCOUNT`,
      brand: bankName,
      last4,
      billingName,
      ...(billingEmail ? { billingEmail } : {}),
      ...(billingPhone ? { billingPhone } : {}),
      ...(input.defaultSelected !== undefined ? { defaultSelected: input.defaultSelected } : {}),
    }),
    cache: `no-store`,
  });

  if (!response.ok) {
    const error = await parseError(response, `Failed to add bank account`);
    return { ok: false, error };
  }

  revalidatePath(`/banking`);
  revalidatePath(`/withdraw`);
  return { ok: true, message: `Bank account added` };
}

export async function createReusableCardSetupIntentMutation(): Promise<StripeSetupIntentResult> {
  const baseUrl = configuredBaseUrl();
  if (!baseUrl) {
    return { ok: false, error: { code: `CONFIG_ERROR`, message: `API base URL is not configured` } };
  }

  const cookieStore = await cookies();
  const response = await fetch(`${baseUrl}/consumer/stripe/intents`, {
    method: `POST`,
    headers: {
      ...buildConsumerMutationHeaders(cookieStore.toString()),
    },
    cache: `no-store`,
  });

  if (!response.ok) {
    const error = await parseError(response, `Failed to start reusable card setup`);
    return { ok: false, error };
  }

  const payload = (await response.json().catch(() => null)) as { clientSecret?: string } | null;
  const clientSecret = payload?.clientSecret?.trim();
  if (!clientSecret) {
    return {
      ok: false,
      error: {
        code: `API_ERROR`,
        message: `Reusable card setup could not start because Stripe did not return a client secret`,
      },
    };
  }

  return {
    ok: true,
    data: {
      clientSecret,
    },
  };
}

export async function confirmReusableCardSetupIntentMutation(setupIntentId: string): Promise<MutationResult> {
  const normalizedSetupIntentId = setupIntentId.trim();
  if (!normalizedSetupIntentId) {
    return invalid(`Reusable card setup is missing a Stripe setup intent id`);
  }

  const baseUrl = configuredBaseUrl();
  if (!baseUrl) {
    return { ok: false, error: { code: `CONFIG_ERROR`, message: `API base URL is not configured` } };
  }

  const cookieStore = await cookies();
  const response = await fetch(`${baseUrl}/consumer/stripe/confirm`, {
    method: `POST`,
    headers: {
      'content-type': `application/json`,
      ...buildConsumerMutationHeaders(cookieStore.toString()),
    },
    body: JSON.stringify({ setupIntentId: normalizedSetupIntentId }),
    cache: `no-store`,
  });

  if (!response.ok) {
    const error = await parseError(response, `Failed to save reusable card`);
    return { ok: false, error };
  }

  revalidatePath(`/banking`);
  revalidatePath(`/payments`);
  return { ok: true, message: `Reusable card added` };
}

export async function addCardMutation(input: {
  brand: string;
  last4: string;
  expMonth: string;
  expYear: string;
  billingName: string;
  billingEmail?: string;
  billingPhone?: string;
  defaultSelected?: boolean;
}): Promise<MutationResult> {
  const brand = input.brand.trim();
  const last4 = input.last4.trim();
  const expMonth = input.expMonth.trim().padStart(2, `0`);
  const expYear = input.expYear.trim();
  const billingName = input.billingName.trim();
  const billingEmail = input.billingEmail?.trim().toLowerCase();
  const billingPhone = normalizePhone(input.billingPhone ?? ``);

  if (!brand) return invalid(`Please enter a card brand`, { brand: `Card brand is required` });
  if (!/^\d{4}$/.test(last4)) return invalid(`Last 4 digits are required`, { last4: `Enter exactly 4 digits` });
  if (!/^(0[1-9]|1[0-2])$/.test(expMonth)) {
    return invalid(`Expiry month must be between 01 and 12`, { expMonth: `Enter a valid month` });
  }
  if (!/^\d{4}$/.test(expYear)) return invalid(`Expiry year is required`, { expYear: `Enter a 4-digit year` });
  if (!billingName) return invalid(`Billing name is required`, { billingName: `Billing name is required` });
  if (billingEmail && !isValidEmail(billingEmail)) {
    return invalid(`Please enter a valid billing email`, { billingEmail: `Enter a valid email address` });
  }
  if (billingPhone && billingPhone.replace(/\D/g, ``).length < 7) {
    return invalid(`Please enter a valid billing phone`, { billingPhone: `Enter at least 7 digits` });
  }

  const baseUrl = configuredBaseUrl();
  if (!baseUrl) {
    return { ok: false, error: { code: `CONFIG_ERROR`, message: `API base URL is not configured` } };
  }

  const cookieStore = await cookies();
  const response = await fetch(`${baseUrl}/consumer/payment-methods`, {
    method: `POST`,
    headers: {
      'content-type': `application/json`,
      ...buildConsumerMutationHeaders(cookieStore.toString()),
      'x-correlation-id': randomUUID(),
    },
    body: JSON.stringify({
      type: `CREDIT_CARD`,
      brand,
      last4,
      expMonth,
      expYear,
      billingName,
      ...(billingEmail ? { billingEmail } : {}),
      ...(billingPhone ? { billingPhone } : {}),
      ...(input.defaultSelected !== undefined ? { defaultSelected: input.defaultSelected } : {}),
    }),
    cache: `no-store`,
  });

  if (!response.ok) {
    const error = await parseError(response, `Failed to add card`);
    return { ok: false, error };
  }

  revalidatePath(`/banking`);
  return { ok: true, message: `Card added` };
}

export async function setDefaultPaymentMethodMutation(paymentMethodId: string): Promise<MutationResult> {
  if (!paymentMethodId.trim()) return invalid(`Invalid payment method id`);

  const baseUrl = configuredBaseUrl();
  if (!baseUrl) {
    return { ok: false, error: { code: `CONFIG_ERROR`, message: `API base URL is not configured` } };
  }

  const cookieStore = await cookies();
  const response = await fetch(`${baseUrl}/consumer/payment-methods/${paymentMethodId}`, {
    method: `PATCH`,
    headers: {
      'content-type': `application/json`,
      ...buildConsumerMutationHeaders(cookieStore.toString()),
      'x-correlation-id': randomUUID(),
    },
    body: JSON.stringify({ defaultSelected: true }),
    cache: `no-store`,
  });

  if (!response.ok) {
    const error = await parseError(response, `Failed to set default payment method`);
    return { ok: false, error };
  }

  revalidatePath(`/banking`);
  revalidatePath(`/withdraw`);
  return { ok: true, message: `Default payment method updated` };
}

export async function deletePaymentMethodMutation(paymentMethodId: string): Promise<MutationResult> {
  if (!paymentMethodId.trim()) return invalid(`Invalid payment method id`);

  const baseUrl = configuredBaseUrl();
  if (!baseUrl) {
    return { ok: false, error: { code: `CONFIG_ERROR`, message: `API base URL is not configured` } };
  }

  const cookieStore = await cookies();
  const response = await fetch(`${baseUrl}/consumer/payment-methods/${paymentMethodId}`, {
    method: `DELETE`,
    headers: {
      ...buildConsumerMutationHeaders(cookieStore.toString()),
      'x-correlation-id': randomUUID(),
    },
    cache: `no-store`,
  });

  if (!response.ok) {
    const error = await parseError(response, `Failed to delete payment method`);
    return { ok: false, error };
  }

  revalidatePath(`/banking`);
  revalidatePath(`/withdraw`);
  return { ok: true, message: `Payment method deleted` };
}

export async function getExchangeQuoteMutation(input: {
  from: string;
  to: string;
  amount: string;
}): Promise<QuoteResult> {
  const from = input.from.trim().toUpperCase();
  const to = input.to.trim().toUpperCase();
  const amount = parseMajorAmountInput(input.amount);

  if (!from || !to || from.length !== 3 || to.length !== 3) {
    return { ok: false, error: { code: `VALIDATION_ERROR`, message: `Select a valid currency pair` } };
  }
  if (from === to) {
    return { ok: false, error: { code: `VALIDATION_ERROR`, message: `Currencies must be different` } };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: { code: `VALIDATION_ERROR`, message: `Enter a valid amount` } };
  }

  const baseUrl = configuredBaseUrl();
  if (!baseUrl) {
    return { ok: false, error: { code: `CONFIG_ERROR`, message: `API base URL is not configured` } };
  }

  const cookieStore = await cookies();
  const response = await fetch(`${baseUrl}/consumer/exchange/quote`, {
    method: `POST`,
    headers: {
      'content-type': `application/json`,
      ...buildConsumerMutationHeaders(cookieStore.toString()),
    },
    body: JSON.stringify({ from, to, amount }),
    cache: `no-store`,
  });

  if (!response.ok) {
    const error = await parseError(response, `Failed to get exchange quote`);
    return { ok: false, error };
  }

  const payload = (await response.json()) as {
    from: string;
    to: string;
    rate: number;
    sourceAmount: number;
    targetAmount: number;
  };

  return {
    ok: true,
    data: {
      from: payload.from,
      to: payload.to,
      rate: payload.rate,
      sourceAmount: payload.sourceAmount,
      targetAmount: payload.targetAmount,
    },
  };
}

export async function refreshExchangeRatesMutation(input: {
  pairs: Array<{ from: string; to: string }>;
}): Promise<ExchangeRatesRefreshResult> {
  const pairs = input.pairs
    .map((pair) => ({
      from: pair.from.trim().toUpperCase(),
      to: pair.to.trim().toUpperCase(),
    }))
    .filter((pair) => pair.from && pair.to && pair.from !== pair.to);

  if (pairs.length === 0) {
    return invalid(`No exchange pairs are available to refresh`) as ExchangeRatesRefreshResult;
  }

  const uniquePairs = Array.from(new Map(pairs.map((pair) => [`${pair.from}:${pair.to}`, pair])).values());

  try {
    const data = await getExchangeRatesBatch(uniquePairs);
    return { ok: true, data };
  } catch {
    return {
      ok: false,
      error: {
        code: `API_ERROR`,
        message: `Failed to refresh exchange rates`,
      },
    };
  }
}

export async function convertExchangeMutation(input: {
  from: string;
  to: string;
  amount: string;
}): Promise<MutationResult> {
  const from = input.from.trim().toUpperCase();
  const to = input.to.trim().toUpperCase();
  const amount = parseMajorAmountInput(input.amount);

  if (!from || !to || from === to) {
    return invalid(`Choose two different currencies`);
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return invalid(`Enter a valid amount`, { amount: `Amount must be greater than zero` });
  }

  const baseUrl = configuredBaseUrl();
  if (!baseUrl) {
    return { ok: false, error: { code: `CONFIG_ERROR`, message: `API base URL is not configured` } };
  }

  const cookieStore = await cookies();
  const response = await fetch(`${baseUrl}/consumer/exchange/convert`, {
    method: `POST`,
    headers: {
      'content-type': `application/json`,
      ...buildConsumerMutationHeaders(cookieStore.toString()),
    },
    body: JSON.stringify({ from, to, amount }),
    cache: `no-store`,
  });

  if (!response.ok) {
    const error = await parseError(response, `Exchange failed`);
    return { ok: false, error };
  }

  revalidatePath(`/exchange`);
  revalidatePath(`/dashboard`);
  return { ok: true, message: `Exchange completed` };
}

export async function createExchangeRuleMutation(input: {
  from: string;
  to: string;
  targetBalance: string;
  maxConvertAmount?: string;
  minIntervalMinutes?: string;
  enabled?: boolean;
}): Promise<MutationResult> {
  const from = input.from.trim().toUpperCase();
  const to = input.to.trim().toUpperCase();
  const targetBalance = parseMajorAmountInput(input.targetBalance);
  const maxConvertAmount =
    input.maxConvertAmount && input.maxConvertAmount.trim() !== ``
      ? parseMajorAmountInput(input.maxConvertAmount)
      : undefined;
  const minIntervalMinutes =
    input.minIntervalMinutes && input.minIntervalMinutes.trim() !== `` ? Number(input.minIntervalMinutes) : undefined;

  if (!from || !to || from === to) return invalid(`Choose two different currencies`);
  if (!Number.isFinite(targetBalance) || targetBalance < 0) {
    return invalid(`Target balance must be zero or greater`, { targetBalance: `Enter a valid target balance` });
  }
  if (maxConvertAmount !== undefined && (!Number.isFinite(maxConvertAmount) || maxConvertAmount <= 0)) {
    return invalid(`Max convert amount must be greater than zero`, { maxConvertAmount: `Enter a valid limit` });
  }
  if (minIntervalMinutes !== undefined && (!Number.isFinite(minIntervalMinutes) || minIntervalMinutes < 1)) {
    return invalid(`Interval must be at least 1 minute`, { minIntervalMinutes: `Enter a valid interval` });
  }

  const baseUrl = configuredBaseUrl();
  if (!baseUrl) {
    return { ok: false, error: { code: `CONFIG_ERROR`, message: `API base URL is not configured` } };
  }

  const cookieStore = await cookies();
  const response = await fetch(`${baseUrl}/consumer/exchange/rules`, {
    method: `POST`,
    headers: {
      'content-type': `application/json`,
      ...buildConsumerMutationHeaders(cookieStore.toString()),
    },
    body: JSON.stringify({
      from,
      to,
      targetBalance,
      ...(maxConvertAmount !== undefined ? { maxConvertAmount } : {}),
      ...(minIntervalMinutes !== undefined ? { minIntervalMinutes } : {}),
      enabled: input.enabled ?? true,
    }),
    cache: `no-store`,
  });

  if (!response.ok) {
    const error = await parseError(response, `Failed to create exchange rule`);
    return { ok: false, error };
  }

  revalidatePath(`/exchange`);
  return { ok: true, message: `Exchange rule created` };
}

export async function updateExchangeRuleMutation(
  ruleId: string,
  input: {
    from?: string;
    to?: string;
    targetBalance?: string;
    maxConvertAmount?: string;
    minIntervalMinutes?: string;
    enabled?: boolean;
  },
): Promise<MutationResult> {
  if (!ruleId.trim()) return invalid(`Invalid rule id`);

  const payload: Record<string, number | string | boolean | null> = {};
  if (input.from) payload.from = input.from.trim().toUpperCase();
  if (input.to) payload.to = input.to.trim().toUpperCase();
  if (input.targetBalance !== undefined) {
    if (input.targetBalance.trim() === ``) {
      return invalid(`Target balance is required`, { targetBalance: `Enter a valid target balance` });
    }
    const targetBalance = parseMajorAmountInput(input.targetBalance);
    if (!Number.isFinite(targetBalance) || targetBalance < 0) {
      return invalid(`Target balance must be zero or greater`, { targetBalance: `Enter a valid target balance` });
    }
    payload.targetBalance = targetBalance;
  }
  if (input.maxConvertAmount !== undefined) {
    if (input.maxConvertAmount.trim() === ``) {
      payload.maxConvertAmount = null;
    } else {
      const maxConvertAmount = parseMajorAmountInput(input.maxConvertAmount);
      if (!Number.isFinite(maxConvertAmount) || maxConvertAmount <= 0) {
        return invalid(`Max convert amount must be greater than zero`, { maxConvertAmount: `Enter a valid limit` });
      }
      payload.maxConvertAmount = maxConvertAmount;
    }
  }
  if (input.minIntervalMinutes !== undefined && input.minIntervalMinutes.trim() !== ``) {
    const minIntervalMinutes = Number(input.minIntervalMinutes);
    if (!Number.isFinite(minIntervalMinutes) || minIntervalMinutes < 1) {
      return invalid(`Interval must be at least 1 minute`, { minIntervalMinutes: `Enter a valid interval` });
    }
    payload.minIntervalMinutes = minIntervalMinutes;
  }
  if (input.enabled !== undefined) payload.enabled = input.enabled;

  const baseUrl = configuredBaseUrl();
  if (!baseUrl) {
    return { ok: false, error: { code: `CONFIG_ERROR`, message: `API base URL is not configured` } };
  }

  const cookieStore = await cookies();
  const response = await fetch(`${baseUrl}/consumer/exchange/rules/${ruleId}`, {
    method: `PATCH`,
    headers: {
      'content-type': `application/json`,
      ...buildConsumerMutationHeaders(cookieStore.toString()),
    },
    body: JSON.stringify(payload),
    cache: `no-store`,
  });

  if (!response.ok) {
    const error = await parseError(response, `Failed to update exchange rule`);
    return { ok: false, error };
  }

  revalidatePath(`/exchange`);
  return { ok: true, message: `Exchange rule updated` };
}

export async function deleteExchangeRuleMutation(ruleId: string): Promise<MutationResult> {
  if (!ruleId.trim()) return invalid(`Invalid rule id`);

  const baseUrl = configuredBaseUrl();
  if (!baseUrl) {
    return { ok: false, error: { code: `CONFIG_ERROR`, message: `API base URL is not configured` } };
  }

  const cookieStore = await cookies();
  const response = await fetch(`${baseUrl}/consumer/exchange/rules/${ruleId}`, {
    method: `DELETE`,
    headers: {
      ...buildConsumerMutationHeaders(cookieStore.toString()),
    },
    cache: `no-store`,
  });

  if (!response.ok) {
    const error = await parseError(response, `Failed to delete exchange rule`);
    return { ok: false, error };
  }

  revalidatePath(`/exchange`);
  return { ok: true, message: `Exchange rule deleted` };
}

export async function scheduleExchangeMutation(input: {
  from: string;
  to: string;
  amount: string;
  executeAt: string;
}): Promise<MutationResult> {
  const from = input.from.trim().toUpperCase();
  const to = input.to.trim().toUpperCase();
  const amount = parseMajorAmountInput(input.amount);
  const executeAt = input.executeAt.trim();

  if (!from || !to || from === to) return invalid(`Choose two different currencies`);
  if (!Number.isFinite(amount) || amount <= 0) {
    return invalid(`Enter a valid amount`, { amount: `Amount must be greater than zero` });
  }
  if (!executeAt) return invalid(`Execution date is required`, { executeAt: `Choose a valid date` });
  const executeAtDate = new Date(executeAt);
  if (Number.isNaN(executeAtDate.getTime())) {
    return invalid(`Execution date is invalid`, { executeAt: `Choose a valid date` });
  }
  if (executeAtDate.getTime() <= Date.now()) {
    return invalid(`Execution date must be in the future`, { executeAt: `Choose a future date and time` });
  }

  const baseUrl = configuredBaseUrl();
  if (!baseUrl) {
    return { ok: false, error: { code: `CONFIG_ERROR`, message: `API base URL is not configured` } };
  }

  const cookieStore = await cookies();
  const response = await fetch(`${baseUrl}/consumer/exchange/scheduled`, {
    method: `POST`,
    headers: {
      'content-type': `application/json`,
      ...buildConsumerMutationHeaders(cookieStore.toString()),
    },
    body: JSON.stringify({
      from,
      to,
      amount,
      executeAt: executeAtDate.toISOString(),
    }),
    cache: `no-store`,
  });

  if (!response.ok) {
    const error = await parseError(response, `Failed to schedule conversion`);
    return { ok: false, error };
  }

  revalidatePath(`/exchange`);
  return { ok: true, message: `Scheduled conversion created` };
}

export async function cancelScheduledExchangeMutation(conversionId: string): Promise<MutationResult> {
  if (!conversionId.trim()) return invalid(`Invalid scheduled conversion id`);

  const baseUrl = configuredBaseUrl();
  if (!baseUrl) {
    return { ok: false, error: { code: `CONFIG_ERROR`, message: `API base URL is not configured` } };
  }

  const cookieStore = await cookies();
  const response = await fetch(`${baseUrl}/consumer/exchange/scheduled/${conversionId}/cancel`, {
    method: `POST`,
    headers: {
      ...buildConsumerMutationHeaders(cookieStore.toString()),
    },
    cache: `no-store`,
  });

  if (!response.ok) {
    const error = await parseError(response, `Failed to cancel scheduled conversion`);
    return { ok: false, error };
  }

  revalidatePath(`/exchange`);
  return { ok: true, message: `Scheduled conversion cancelled` };
}
