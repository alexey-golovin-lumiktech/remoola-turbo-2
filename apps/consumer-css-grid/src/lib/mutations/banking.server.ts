'use server';

import { randomUUID } from 'crypto';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

import { SESSION_EXPIRED_ERROR_CODE } from '../auth-failure';
import { buildConsumerMutationHeaders } from '../consumer-auth-headers.server';
import { getEnv } from '../env.server';

type MutationResult =
  | { ok: true; message?: string }
  | { ok: false; error: { code: string; message: string; fields?: Record<string, string> } };

type StripeSetupIntentResult =
  | {
      ok: true;
      data: {
        clientSecret: string;
      };
    }
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

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizePhone(value: string) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, ``).slice(0, 15);
  if (!digits) return ``;
  return trimmed.startsWith(`+`) ? `+${digits}` : digits;
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
