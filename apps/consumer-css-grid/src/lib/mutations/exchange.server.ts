'use server';

import { revalidatePath } from 'next/cache';

import { encodeApiPathSegment } from '../api-path';
import { getExchangeRatesBatch, type ExchangeRatesBatchResult } from '../consumer-api.server';
import {
  configuredBaseUrl,
  consumerMutationHeaders,
  fetch,
  invalid,
  parseError,
  parseMajorAmountInput,
  type MutationResult,
} from './mutation-runtime.server';

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

  const response = await fetch(`${baseUrl}/consumer/exchange/quote`, {
    method: `POST`,
    headers: {
      'content-type': `application/json`,
      ...(await consumerMutationHeaders()),
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

  const response = await fetch(`${baseUrl}/consumer/exchange/convert`, {
    method: `POST`,
    headers: {
      'content-type': `application/json`,
      ...(await consumerMutationHeaders()),
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

  const response = await fetch(`${baseUrl}/consumer/exchange/rules`, {
    method: `POST`,
    headers: {
      'content-type': `application/json`,
      ...(await consumerMutationHeaders()),
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

  const response = await fetch(`${baseUrl}/consumer/exchange/rules/${encodeApiPathSegment(ruleId)}`, {
    method: `PATCH`,
    headers: {
      'content-type': `application/json`,
      ...(await consumerMutationHeaders()),
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

  const response = await fetch(`${baseUrl}/consumer/exchange/rules/${encodeApiPathSegment(ruleId)}`, {
    method: `DELETE`,
    headers: {
      ...(await consumerMutationHeaders()),
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

  const response = await fetch(`${baseUrl}/consumer/exchange/scheduled`, {
    method: `POST`,
    headers: {
      'content-type': `application/json`,
      ...(await consumerMutationHeaders()),
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

  const response = await fetch(`${baseUrl}/consumer/exchange/scheduled/${encodeApiPathSegment(conversionId)}/cancel`, {
    method: `POST`,
    headers: {
      ...(await consumerMutationHeaders()),
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
