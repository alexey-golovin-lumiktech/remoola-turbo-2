import 'server-only';

import { randomUUID } from 'crypto';

import { revalidatePath } from 'next/cache';

import { type ConsumerTransferResponse } from '@remoola/api-types';

import {
  configuredBaseUrl,
  consumerMutationHeaders,
  fetch,
  invalid,
  parseError,
  parseMajorAmountInput,
  type MutationResult,
} from './mutation-runtime.server';

type TransferResult =
  | { ok: true; ledgerId?: string; message?: string }
  | { ok: false; error: { code: string; message: string; fields?: Record<string, string> } };

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

  const baseUrl = configuredBaseUrl();
  if (!baseUrl) {
    return {
      ok: false,
      error: { code: `CONFIG_ERROR`, message: `API base URL is not configured` },
    };
  }

  const idempotencyKey = randomUUID();
  const response = await fetch(`${baseUrl}/consumer/payments/withdraw`, {
    method: `POST`,
    headers: {
      'content-type': `application/json`,
      ...(await consumerMutationHeaders()),
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
    const idempotencyKey = randomUUID();
    const response = await fetch(`${baseUrl}/consumer/payments/transfer`, {
      method: `POST`,
      headers: {
        'content-type': `application/json`,
        ...(await consumerMutationHeaders()),
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

    const payload = (await response.json().catch(() => null)) as ConsumerTransferResponse | null;
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
