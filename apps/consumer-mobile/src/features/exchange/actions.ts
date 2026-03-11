'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

import type { IConsumerExchangeConversion, IConsumerExchangeQuote } from '@remoola/api-types';

import {
  exchangeConversionSchema,
  exchangeQuoteSchema,
  createExchangeRuleSchema,
  updateExchangeRuleSchema,
} from './schemas';
import { getEnv } from '../../lib/env.server';

interface AppError {
  code: string;
  message: string;
  fields?: Record<string, string>;
}

type AppResult<T> = { ok: true; data: T } | { ok: false; error: AppError };

interface ExchangeRule {
  id: string;
  name: string;
  fromCurrency: string;
  toCurrency: string;
  enabled: boolean;
  createdAt: string;
}

export async function getExchangeQuote(
  fromCurrency: string,
  toCurrency: string,
  amount: number,
): Promise<AppResult<IConsumerExchangeQuote>> {
  const parsed = exchangeQuoteSchema.safeParse({ fromCurrency, toCurrency, amount });

  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: `VALIDATION_ERROR`,
        message: `Invalid quote request`,
        fields: parsed.error.flatten().fieldErrors as Record<string, string>,
      },
    };
  }

  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    return {
      ok: false,
      error: { code: `CONFIG_ERROR`, message: `API not configured` },
    };
  }

  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.toString();

    const body = {
      from: parsed.data.fromCurrency,
      to: parsed.data.toCurrency,
      amount: parsed.data.amount,
    };

    const res = await fetch(`${baseUrl}/consumer/exchange/quote`, {
      method: `POST`,
      headers: {
        'Content-Type': `application/json`,
        Cookie: cookie,
      },
      body: JSON.stringify(body),
      cache: `no-store`,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return {
        ok: false,
        error: {
          code: errorData.code ?? `QUOTE_ERROR`,
          message: errorData.message ?? `Failed to get quote`,
        },
      };
    }

    const data = await res.json();
    const num = (v: unknown): number => (typeof v === `number` && Number.isFinite(v) ? v : 0);
    const quote: IConsumerExchangeQuote = {
      from: typeof data.from === `string` ? data.from : ``,
      to: typeof data.to === `string` ? data.to : ``,
      rate: num(data.rate),
      amountFrom: num(data.sourceAmount),
      amountTo: num(data.targetAmount),
      timestamp: typeof data.timestamp === `string` ? data.timestamp : new Date().toISOString(),
    };
    return { ok: true, data: quote };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: `NETWORK_ERROR`,
        message: error instanceof Error ? error.message : `Network error`,
      },
    };
  }
}

export async function executeExchange(
  fromCurrency: string,
  toCurrency: string,
  amount: number,
  idempotencyKey?: string,
): Promise<AppResult<IConsumerExchangeConversion>> {
  const parsed = exchangeConversionSchema.safeParse({ fromCurrency, toCurrency, amount });

  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: `VALIDATION_ERROR`,
        message: `Invalid exchange request`,
        fields: parsed.error.flatten().fieldErrors as Record<string, string>,
      },
    };
  }

  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    return {
      ok: false,
      error: { code: `CONFIG_ERROR`, message: `API not configured` },
    };
  }

  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.toString();

    const headers: HeadersInit = {
      'Content-Type': `application/json`,
      Cookie: cookie,
    };

    if (idempotencyKey) {
      headers[`Idempotency-Key`] = idempotencyKey;
    }

    const body = {
      from: parsed.data.fromCurrency,
      to: parsed.data.toCurrency,
      amount: parsed.data.amount,
    };

    const res = await fetch(`${baseUrl}/consumer/exchange/convert`, {
      method: `POST`,
      headers,
      body: JSON.stringify(body),
      cache: `no-store`,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return {
        ok: false,
        error: {
          code: errorData.code ?? `EXCHANGE_ERROR`,
          message: errorData.message ?? `Exchange failed`,
        },
      };
    }

    const data = await res.json();
    const num = (v: unknown): number => (typeof v === `number` && Number.isFinite(v) ? v : 0);
    const conversion: IConsumerExchangeConversion = {
      id: typeof data.entryId === `string` ? data.entryId : typeof data.id === `string` ? data.id : ``,
      fromCurrency: typeof data.from === `string` ? data.from : ``,
      toCurrency: typeof data.to === `string` ? data.to : ``,
      amountFrom: num(data.sourceAmount),
      amountTo: num(data.targetAmount),
      rate: num(data.rate),
      status: typeof data.status === `string` ? data.status : `completed`,
      createdAt: typeof data.createdAt === `string` ? data.createdAt : new Date().toISOString(),
    };

    revalidatePath(`/exchange`);
    revalidatePath(`/dashboard`);

    return { ok: true, data: conversion };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: `NETWORK_ERROR`,
        message: error instanceof Error ? error.message : `Network error`,
      },
    };
  }
}

export async function createExchangeRule(
  name: string,
  fromCurrency: string,
  toCurrency: string,
  enabled: boolean = true,
): Promise<AppResult<ExchangeRule>> {
  const parsed = createExchangeRuleSchema.safeParse({ name, fromCurrency, toCurrency, enabled });

  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: `VALIDATION_ERROR`,
        message: `Invalid rule data`,
        fields: parsed.error.flatten().fieldErrors as Record<string, string>,
      },
    };
  }

  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    return {
      ok: false,
      error: { code: `CONFIG_ERROR`, message: `API not configured` },
    };
  }

  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.toString();

    const res = await fetch(`${baseUrl}/consumer/exchange/rules`, {
      method: `POST`,
      headers: {
        'Content-Type': `application/json`,
        Cookie: cookie,
      },
      body: JSON.stringify(parsed.data),
      cache: `no-store`,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return {
        ok: false,
        error: {
          code: errorData.code ?? `CREATE_RULE_ERROR`,
          message: errorData.message ?? `Failed to create rule`,
        },
      };
    }

    const data = await res.json();

    revalidatePath(`/exchange/rules`);

    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: `NETWORK_ERROR`,
        message: error instanceof Error ? error.message : `Network error`,
      },
    };
  }
}

export async function updateExchangeRule(
  ruleId: string,
  updates: { name?: string; enabled?: boolean },
): Promise<AppResult<ExchangeRule>> {
  const parsed = updateExchangeRuleSchema.safeParse({ ...updates, ruleId });

  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: `VALIDATION_ERROR`,
        message: `Invalid update data`,
        fields: parsed.error.flatten().fieldErrors as Record<string, string>,
      },
    };
  }

  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    return {
      ok: false,
      error: { code: `CONFIG_ERROR`, message: `API not configured` },
    };
  }

  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.toString();

    const res = await fetch(`${baseUrl}/consumer/exchange/rules/${ruleId}`, {
      method: `PATCH`,
      headers: {
        'Content-Type': `application/json`,
        Cookie: cookie,
      },
      body: JSON.stringify(updates),
      cache: `no-store`,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return {
        ok: false,
        error: {
          code: errorData.code ?? `UPDATE_RULE_ERROR`,
          message: errorData.message ?? `Failed to update rule`,
        },
      };
    }

    const data = await res.json();

    revalidatePath(`/exchange/rules`);

    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: `NETWORK_ERROR`,
        message: error instanceof Error ? error.message : `Network error`,
      },
    };
  }
}

export async function deleteExchangeRule(ruleId: string): Promise<AppResult<void>> {
  if (!ruleId || ruleId.trim() === ``) {
    return {
      ok: false,
      error: {
        code: `VALIDATION_ERROR`,
        message: `Rule ID is required`,
      },
    };
  }

  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    return {
      ok: false,
      error: { code: `CONFIG_ERROR`, message: `API not configured` },
    };
  }

  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.toString();

    const res = await fetch(`${baseUrl}/consumer/exchange/rules/${ruleId}`, {
      method: `DELETE`,
      headers: {
        Cookie: cookie,
      },
      cache: `no-store`,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return {
        ok: false,
        error: {
          code: errorData.code ?? `DELETE_RULE_ERROR`,
          message: errorData.message ?? `Failed to delete rule`,
        },
      };
    }

    revalidatePath(`/exchange/rules`);

    return { ok: true, data: undefined };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: `NETWORK_ERROR`,
        message: error instanceof Error ? error.message : `Network error`,
      },
    };
  }
}

export async function cancelScheduledConversion(conversionId: string): Promise<AppResult<void>> {
  if (!conversionId || conversionId.trim() === ``) {
    return {
      ok: false,
      error: {
        code: `VALIDATION_ERROR`,
        message: `Conversion ID is required`,
      },
    };
  }

  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    return {
      ok: false,
      error: { code: `CONFIG_ERROR`, message: `API not configured` },
    };
  }

  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.toString();

    const res = await fetch(`${baseUrl}/consumer/exchange/scheduled/${conversionId}/cancel`, {
      method: `POST`,
      headers: {
        Cookie: cookie,
      },
      cache: `no-store`,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return {
        ok: false,
        error: {
          code: errorData.code ?? `CANCEL_ERROR`,
          message: errorData.message ?? `Failed to cancel conversion`,
        },
      };
    }

    revalidatePath(`/exchange/scheduled`);

    return { ok: true, data: undefined };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: `NETWORK_ERROR`,
        message: error instanceof Error ? error.message : `Network error`,
      },
    };
  }
}
