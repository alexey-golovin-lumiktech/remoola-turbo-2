'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { z } from 'zod';

import { getEnv } from '../../lib/env.server';
import { generateCorrelationId, serverLogger } from '../../lib/logger.server';

const setDefaultPaymentMethodSchema = z.object({
  paymentMethodId: z.string().min(1),
});

const deletePaymentMethodSchema = z.object({
  paymentMethodId: z.string().min(1),
});

type AppError = {
  code: string;
  message: string;
  fields?: Record<string, string>;
};

type AppResult<T> = { ok: true; data: T } | { ok: false; error: AppError };

export async function setDefaultPaymentMethodAction(paymentMethodId: string): Promise<AppResult<{ success: boolean }>> {
  const correlationId = generateCorrelationId();
  const validation = setDefaultPaymentMethodSchema.safeParse({ paymentMethodId });

  if (!validation.success) {
    serverLogger.warn(`Set default payment method validation failed`, { correlationId });
    return {
      ok: false,
      error: {
        code: `VALIDATION_ERROR`,
        message: `Invalid payment method selection`,
        fields: validation.error.flatten().fieldErrors as Record<string, string>,
      },
    };
  }

  try {
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

    serverLogger.auditLog(`SET_DEFAULT_PAYMENT_METHOD`, {
      paymentMethodId,
      correlationId,
    });

    const cookieStore = await cookies();
    const cookie = cookieStore.toString();

    const url = `${baseUrl}/consumer/payment-methods/${paymentMethodId}`;
    const res = await fetch(url, {
      method: `PATCH`,
      headers: {
        'Content-Type': `application/json`,
        Cookie: cookie,
        'X-Correlation-ID': correlationId,
      },
      body: JSON.stringify({ defaultSelected: true }),
      cache: `no-store`,
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => `Unknown error`);
      serverLogger.error(`Failed to set default payment method`, {
        correlationId,
        status: res.status,
        error: errorText,
      });
      return {
        ok: false,
        error: {
          code: `API_ERROR`,
          message: `Unable to set default payment method. Please try again.`,
        },
      };
    }

    serverLogger.info(`Default payment method set successfully`, { correlationId });
    revalidatePath(`/payment-methods`);
    return { ok: true, data: { success: true } };
  } catch (error) {
    serverLogger.error(`Set default payment method exception`, { correlationId, error });
    return {
      ok: false,
      error: {
        code: `NETWORK_ERROR`,
        message: `Network error. Please check your connection.`,
      },
    };
  }
}

export async function deletePaymentMethodAction(paymentMethodId: string): Promise<AppResult<{ success: boolean }>> {
  const correlationId = generateCorrelationId();
  const validation = deletePaymentMethodSchema.safeParse({ paymentMethodId });

  if (!validation.success) {
    serverLogger.warn(`Delete payment method validation failed`, { correlationId });
    return {
      ok: false,
      error: {
        code: `VALIDATION_ERROR`,
        message: `Invalid payment method selection`,
        fields: validation.error.flatten().fieldErrors as Record<string, string>,
      },
    };
  }

  try {
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

    serverLogger.auditLog(`DELETE_PAYMENT_METHOD`, {
      paymentMethodId,
      correlationId,
    });

    const cookieStore = await cookies();
    const cookie = cookieStore.toString();

    const url = `${baseUrl}/consumer/payment-methods/${paymentMethodId}`;
    const res = await fetch(url, {
      method: `DELETE`,
      headers: {
        Cookie: cookie,
        'X-Correlation-ID': correlationId,
      },
      cache: `no-store`,
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => `Unknown error`);
      serverLogger.error(`Failed to delete payment method`, {
        correlationId,
        status: res.status,
        error: errorText,
      });
      return {
        ok: false,
        error: {
          code: `API_ERROR`,
          message: `Unable to delete payment method. Please try again.`,
        },
      };
    }

    serverLogger.info(`Payment method deleted successfully`, { correlationId });
    revalidatePath(`/payment-methods`);
    return { ok: true, data: { success: true } };
  } catch (error) {
    serverLogger.error(`Delete payment method exception`, { correlationId, error });
    return {
      ok: false,
      error: {
        code: `NETWORK_ERROR`,
        message: `Network error. Please check your connection.`,
      },
    };
  }
}

const addPaymentMethodSchema = z.object({
  setupIntentId: z.string().optional(),
  stripePaymentMethodId: z.string().min(1),
  defaultSelected: z.boolean().optional(),
  billingName: z.string().min(1),
  billingEmail: z.union([z.string().email(), z.literal(``)]).optional(),
  billingPhone: z.string().optional(),
  brand: z.string().min(1),
  last4: z.string().length(4),
  expMonth: z.coerce.number().int().min(1).max(12),
  expYear: z.coerce.number().int().min(2024),
});

type AddPaymentMethodInput = z.infer<typeof addPaymentMethodSchema>;

export async function addPaymentMethodAction(input: AddPaymentMethodInput): Promise<AppResult<{ success: boolean }>> {
  const correlationId = generateCorrelationId();
  const validation = addPaymentMethodSchema.safeParse(input);

  if (!validation.success) {
    const fieldErrors = validation.error.flatten().fieldErrors;
    serverLogger.warn(`Add payment method validation failed`, { correlationId, errors: fieldErrors });

    return {
      ok: false,
      error: {
        code: `VALIDATION_ERROR`,
        message: `Please check your payment method details`,
        fields: fieldErrors as Record<string, string>,
      },
    };
  }

  try {
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

    serverLogger.auditLog(`ADD_PAYMENT_METHOD`, {
      brand: validation.data.brand,
      last4: validation.data.last4,
      correlationId,
    });

    const cookieStore = await cookies();
    const cookie = cookieStore.toString();

    const payload = {
      type: `CREDIT_CARD`,
      setupIntentId: validation.data.setupIntentId,
      defaultSelected: validation.data.defaultSelected ?? true,
      billingName: validation.data.billingName,
      billingEmail: validation.data.billingEmail || undefined,
      billingPhone: validation.data.billingPhone || undefined,
      brand: validation.data.brand,
      last4: validation.data.last4,
      expMonth: String(validation.data.expMonth).padStart(2, `0`),
      expYear: String(validation.data.expYear),
      stripePaymentMethodId: validation.data.stripePaymentMethodId,
    };

    const url = `${baseUrl}/consumer/payment-methods`;
    const res = await fetch(url, {
      method: `POST`,
      headers: {
        'Content-Type': `application/json`,
        Cookie: cookie,
        'X-Correlation-ID': correlationId,
      },
      body: JSON.stringify(payload),
      cache: `no-store`,
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => `Unknown error`);
      serverLogger.error(`Failed to add payment method`, {
        correlationId,
        status: res.status,
        error: errorText,
      });
      return {
        ok: false,
        error: {
          code: `API_ERROR`,
          message: `Unable to add payment method. Please try again.`,
        },
      };
    }

    serverLogger.info(`Payment method added successfully`, { correlationId });
    revalidatePath(`/payment-methods`);
    return { ok: true, data: { success: true } };
  } catch (error) {
    serverLogger.error(`Add payment method exception`, { correlationId, error });
    return {
      ok: false,
      error: {
        code: `NETWORK_ERROR`,
        message: `Network error. Please check your connection.`,
      },
    };
  }
}

const addBankAccountSchema = z.object({
  defaultSelected: z.boolean().optional(),
  billingName: z.string().min(1),
  billingEmail: z.union([z.string().email(), z.literal(``)]).optional(),
  billingPhone: z.string().optional(),
  bankName: z.string().min(1),
  last4: z.string().length(4),
  routingNumber: z.string().length(9),
  accountNumber: z.string().min(4),
});

type AddBankAccountInput = z.infer<typeof addBankAccountSchema>;

export async function addBankAccountAction(input: AddBankAccountInput): Promise<AppResult<{ success: boolean }>> {
  const correlationId = generateCorrelationId();
  const validation = addBankAccountSchema.safeParse(input);

  if (!validation.success) {
    const fieldErrors = validation.error.flatten().fieldErrors;
    serverLogger.warn(`Add bank account validation failed`, { correlationId, errors: fieldErrors });

    return {
      ok: false,
      error: {
        code: `VALIDATION_ERROR`,
        message: `Please check your bank account details`,
        fields: fieldErrors as Record<string, string>,
      },
    };
  }

  try {
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

    serverLogger.auditLog(`ADD_BANK_ACCOUNT`, {
      bankName: validation.data.bankName,
      last4: validation.data.last4,
      correlationId,
    });

    const cookieStore = await cookies();
    const cookie = cookieStore.toString();

    const payload = {
      type: `BANK_ACCOUNT`,
      defaultSelected: validation.data.defaultSelected ?? true,
      billingName: validation.data.billingName,
      billingEmail: validation.data.billingEmail || undefined,
      billingPhone: validation.data.billingPhone || undefined,
      brand: validation.data.bankName,
      last4: validation.data.last4,
      routingNumber: validation.data.routingNumber,
      accountNumber: validation.data.accountNumber,
    };

    const url = `${baseUrl}/consumer/payment-methods`;
    const res = await fetch(url, {
      method: `POST`,
      headers: {
        'Content-Type': `application/json`,
        Cookie: cookie,
        'X-Correlation-ID': correlationId,
      },
      body: JSON.stringify(payload),
      cache: `no-store`,
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => `Unknown error`);
      serverLogger.error(`Failed to add bank account`, {
        correlationId,
        status: res.status,
        error: errorText,
      });
      return {
        ok: false,
        error: {
          code: `API_ERROR`,
          message: `Unable to add bank account. Please try again.`,
        },
      };
    }

    serverLogger.info(`Bank account added successfully`, { correlationId });
    revalidatePath(`/payment-methods`);
    return { ok: true, data: { success: true } };
  } catch (error) {
    serverLogger.error(`Add bank account exception`, { correlationId, error });
    return {
      ok: false,
      error: {
        code: `NETWORK_ERROR`,
        message: `Network error. Please check your connection.`,
      },
    };
  }
}
