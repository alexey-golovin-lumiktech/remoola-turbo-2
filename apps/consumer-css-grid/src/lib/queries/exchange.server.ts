import 'server-only';

import { fetchConsumerApi, postConsumerApi, type ConsumerApiRequestOptions } from '../consumer-api-fetch.server';
import {
  type ExchangeCurrency,
  type ExchangeRateCard,
  type ExchangeRatesBatchResult,
  type ExchangeRule,
  type ScheduledConversion,
} from '../consumer-api.types';

interface ExchangeRateBatchItem {
  from?: string;
  to?: string;
  rate?: number;
  code?: string;
}

export async function getExchangeCurrencies(options?: ConsumerApiRequestOptions): Promise<ExchangeCurrency[] | null> {
  return fetchConsumerApi<ExchangeCurrency[]>(`/consumer/exchange/currencies`, options);
}

function normalizeExchangeRateBatchItem(
  pair: { from: string; to: string },
  item?: ExchangeRateBatchItem,
): ExchangeRateCard {
  if (typeof item?.rate === `number`) {
    return {
      from: pair.from,
      to: pair.to,
      rate: item.rate,
      status: `available`,
    };
  }

  if (item?.code === `RATE_STALE`) {
    return {
      from: pair.from,
      to: pair.to,
      rate: null,
      status: `stale`,
    };
  }

  return {
    from: pair.from,
    to: pair.to,
    rate: null,
    status: `unavailable`,
  };
}

export async function getExchangeRatesBatch(
  pairs: Array<{ from: string; to: string }>,
  options?: ConsumerApiRequestOptions,
): Promise<ExchangeRatesBatchResult> {
  if (pairs.length === 0) return { items: [], unavailable: false };

  const raw = await postConsumerApi<{
    data?: ExchangeRateBatchItem[];
  }>(`/consumer/exchange/rates/batch`, { pairs }, options);

  if (!Array.isArray(raw?.data)) {
    return { items: [], unavailable: true };
  }

  const rowsByPair = new Map<string, ExchangeRateBatchItem>();
  for (const item of raw.data) {
    if (typeof item?.from !== `string` || typeof item?.to !== `string`) continue;
    rowsByPair.set(`${item.from}:${item.to}`, item);
  }

  return {
    items: pairs.map((pair) => normalizeExchangeRateBatchItem(pair, rowsByPair.get(`${pair.from}:${pair.to}`))),
    unavailable: false,
  };
}

export async function getExchangeRules(
  page = 1,
  pageSize = 10,
  options?: ConsumerApiRequestOptions,
): Promise<{ items: ExchangeRule[]; total: number } | null> {
  return fetchConsumerApi<{ items: ExchangeRule[]; total: number }>(
    `/consumer/exchange/rules?page=${page}&pageSize=${pageSize}`,
    options,
  );
}

export async function getScheduledConversions(
  page = 1,
  pageSize = 10,
  options?: ConsumerApiRequestOptions,
): Promise<{ items: ScheduledConversion[]; total: number } | null> {
  return fetchConsumerApi<{ items: ScheduledConversion[]; total: number }>(
    `/consumer/exchange/scheduled?page=${page}&pageSize=${pageSize}`,
    options,
  );
}
