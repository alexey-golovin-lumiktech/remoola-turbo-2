import 'server-only';

import { randomUUID } from 'crypto';

import { revalidatePath } from 'next/cache';

import {
  type ConsumerInvoiceGenerationResponse,
  type ConsumerPayWithSavedMethodResponse,
  type ConsumerStripeCheckoutSessionResponse,
  type ConsumerVerificationSessionResponse,
  CURRENT_CONSUMER_APP_SCOPE,
} from '@remoola/api-types';

import { normalizeDocumentDownloadUrl } from '../document-download-url';
import {
  configuredBaseUrl,
  consumerMutationHeaders,
  fetch,
  normalizePaymentFlowMutationContext,
  parseError,
  revalidateContractPaths,
  type PaymentFlowMutationContext,
} from './mutation-runtime.server';

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

  const savedMethodUrl = new URL(`${baseUrl}/consumer/stripe/${id}/pay-with-saved-method`);
  savedMethodUrl.searchParams.set(`appScope`, CURRENT_CONSUMER_APP_SCOPE);
  const response = await fetch(savedMethodUrl, {
    method: `POST`,
    headers: {
      'content-type': `application/json`,
      ...(await consumerMutationHeaders()),
      'idempotency-key': randomUUID(),
    },
    body: JSON.stringify({ paymentMethodId: methodId }),
    cache: `no-store`,
  });

  if (!response.ok) {
    const error = await parseError(response, `Failed to process payment with the saved method`);
    return { ok: false, error };
  }

  const payload = (await response.json().catch(() => null)) as ConsumerPayWithSavedMethodResponse | null;

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

  const checkoutUrl = new URL(`${baseUrl}/consumer/stripe/${id}/stripe-session`);
  checkoutUrl.searchParams.set(`appScope`, CURRENT_CONSUMER_APP_SCOPE);
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
      ...(await consumerMutationHeaders()),
    },
    cache: `no-store`,
  });

  if (!response.ok) {
    const error = await parseError(response, `Failed to start checkout`);
    return { ok: false, error };
  }

  const payload = (await response.json().catch(() => null)) as ConsumerStripeCheckoutSessionResponse | null;
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

  const response = await fetch(`${baseUrl}/consumer/payments/${id}/generate-invoice`, {
    method: `POST`,
    headers: {
      ...(await consumerMutationHeaders()),
    },
    cache: `no-store`,
  });

  if (!response.ok) {
    const error = await parseError(response, `Failed to generate invoice`);
    return { ok: false, error };
  }

  const payload = (await response.json().catch(() => null)) as ConsumerInvoiceGenerationResponse | null;

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

  const response = await fetch(`${baseUrl}/consumer/verification/sessions`, {
    method: `POST`,
    headers: {
      ...(await consumerMutationHeaders()),
    },
    cache: `no-store`,
  });

  if (!response.ok) {
    const error = await parseError(response, `Failed to start verification`);
    return { ok: false, error };
  }

  const payload = (await response.json().catch(() => null)) as ConsumerVerificationSessionResponse | null;

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
