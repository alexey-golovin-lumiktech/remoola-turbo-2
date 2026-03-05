'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { z } from 'zod';

import { getEnv } from '../../lib/env.server';
import { generateCorrelationId, serverLogger } from '../../lib/logger.server';

type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: { code: string; message: string; fields?: Record<string, string> } };

const startPaymentSchema = z.object({
  amount: z.number().positive(),
  currencyCode: z.string().min(3),
});

const withdrawSchema = z.object({
  amount: z.number().positive(`Amount must be positive`),
  currency: z.string().min(3, `Currency is required`),
  paymentMethodId: z.string().min(1, `Payment method is required`),
  note: z.string().optional(),
});

const transferSchema = z.object({
  amount: z.number().positive(`Amount must be positive`),
  currency: z.string().min(3, `Currency is required`),
  recipientId: z.string().min(1, `Recipient is required`),
  note: z.string().optional(),
});

export async function startPaymentAction(input: unknown) {
  const correlationId = generateCorrelationId();
  const parsed = startPaymentSchema.safeParse(input);

  if (!parsed.success) {
    serverLogger.warn(`Payment start validation failed`, { correlationId, errors: parsed.error.flatten() });
    return {
      ok: false as const,
      error: { code: `VALIDATION_ERROR`, message: `Invalid payment payload` },
    };
  }

  const env = getEnv();
  if (!env.NEXT_PUBLIC_API_BASE_URL) {
    serverLogger.error(`API base URL not configured`, { correlationId });
    return {
      ok: false as const,
      error: { code: `CONFIG_ERROR`, message: `Service temporarily unavailable` },
    };
  }

  try {
    serverLogger.auditLog(`PAYMENT_START_INITIATED`, {
      amount: parsed.data.amount,
      currency: parsed.data.currencyCode,
      correlationId,
    });

    const cookieStore = await cookies();
    const res = await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/consumer/payments/start`, {
      method: `POST`,
      headers: {
        'content-type': `application/json`,
        Cookie: cookieStore.toString(),
        'X-Correlation-ID': correlationId,
      },
      body: JSON.stringify(parsed.data),
      cache: `no-store`,
    });

    if (!res.ok) {
      serverLogger.error(`Payment start failed`, {
        correlationId,
        status: res.status,
        statusText: res.statusText,
      });
      return {
        ok: false as const,
        error: {
          code: `PAYMENT_START_FAILED`,
          message: `Unable to start payment. Please try again.`,
        },
      };
    }

    serverLogger.info(`Payment started successfully`, { correlationId });
    revalidatePath(`/payments`);
    return { ok: true as const };
  } catch (error) {
    serverLogger.error(`Payment start exception`, { correlationId, error });
    return {
      ok: false as const,
      error: {
        code: `NETWORK_ERROR`,
        message: `Network error. Please check your connection.`,
      },
    };
  }
}

export async function withdrawFundsAction(input: unknown): Promise<ActionResult> {
  const correlationId = generateCorrelationId();
  const parsed = withdrawSchema.safeParse(input);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    serverLogger.warn(`Withdraw validation failed`, { correlationId, errors: fieldErrors });
    return {
      ok: false,
      error: {
        code: `VALIDATION_ERROR`,
        message: `Please check your input and try again`,
        fields: {
          amount: fieldErrors.amount?.[0] ?? ``,
          currency: fieldErrors.currency?.[0] ?? ``,
          paymentMethodId: fieldErrors.paymentMethodId?.[0] ?? ``,
        },
      },
    };
  }

  const env = getEnv();
  if (!env.NEXT_PUBLIC_API_BASE_URL) {
    serverLogger.error(`API base URL not configured`, { correlationId });
    return {
      ok: false,
      error: { code: `CONFIG_ERROR`, message: `Service temporarily unavailable` },
    };
  }

  try {
    serverLogger.auditLog(`WITHDRAW_INITIATED`, {
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      paymentMethodId: parsed.data.paymentMethodId,
      correlationId,
    });

    const cookieStore = await cookies();
    const res = await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/consumer/payments/withdraw`, {
      method: `POST`,
      headers: {
        'content-type': `application/json`,
        Cookie: cookieStore.toString(),
        'X-Correlation-ID': correlationId,
      },
      body: JSON.stringify(parsed.data),
      cache: `no-store`,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      serverLogger.error(`Withdraw failed`, {
        correlationId,
        status: res.status,
        errorCode: errorData.code,
      });

      return {
        ok: false,
        error: {
          code: errorData.code ?? `WITHDRAW_FAILED`,
          message: errorData.message ?? `Withdrawal could not be completed. Please try again.`,
        },
      };
    }

    serverLogger.info(`Withdraw completed successfully`, { correlationId });
    revalidatePath(`/payments`);
    revalidatePath(`/dashboard`);
    return { ok: true };
  } catch (error) {
    serverLogger.error(`Withdraw exception`, { correlationId, error });
    return {
      ok: false,
      error: {
        code: `NETWORK_ERROR`,
        message: `Network error. Please check your connection.`,
      },
    };
  }
}

export async function transferFundsAction(input: unknown): Promise<ActionResult> {
  const correlationId = generateCorrelationId();
  const parsed = transferSchema.safeParse(input);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    serverLogger.warn(`Transfer validation failed`, { correlationId, errors: fieldErrors });
    return {
      ok: false,
      error: {
        code: `VALIDATION_ERROR`,
        message: `Please check your input and try again`,
        fields: {
          amount: fieldErrors.amount?.[0] ?? ``,
          currency: fieldErrors.currency?.[0] ?? ``,
          recipientId: fieldErrors.recipientId?.[0] ?? ``,
        },
      },
    };
  }

  const env = getEnv();
  if (!env.NEXT_PUBLIC_API_BASE_URL) {
    serverLogger.error(`API base URL not configured`, { correlationId });
    return {
      ok: false,
      error: { code: `CONFIG_ERROR`, message: `Service temporarily unavailable` },
    };
  }

  try {
    serverLogger.auditLog(`TRANSFER_INITIATED`, {
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      recipientId: parsed.data.recipientId,
      correlationId,
    });

    const cookieStore = await cookies();
    const res = await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/consumer/payments/transfer`, {
      method: `POST`,
      headers: {
        'content-type': `application/json`,
        Cookie: cookieStore.toString(),
        'X-Correlation-ID': correlationId,
      },
      body: JSON.stringify(parsed.data),
      cache: `no-store`,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      serverLogger.error(`Transfer failed`, {
        correlationId,
        status: res.status,
        errorCode: errorData.code,
      });

      return {
        ok: false,
        error: {
          code: errorData.code ?? `TRANSFER_FAILED`,
          message: errorData.message ?? `Transfer could not be completed. Please try again.`,
        },
      };
    }

    serverLogger.info(`Transfer completed successfully`, { correlationId });
    revalidatePath(`/payments`);
    revalidatePath(`/dashboard`);
    return { ok: true };
  } catch (error) {
    serverLogger.error(`Transfer exception`, { correlationId, error });
    return {
      ok: false,
      error: {
        code: `NETWORK_ERROR`,
        message: `Network error. Please check your connection.`,
      },
    };
  }
}
