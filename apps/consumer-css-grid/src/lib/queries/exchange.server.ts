import 'server-only';

import {
  type ConsumerExchangeCurrenciesResponse,
  type ConsumerExchangeCurrency,
  type ConsumerExchangeRatesBatchResponse,
  type ConsumerExchangeRulesResponse,
  type ConsumerScheduledConversionsResponse,
} from '@remoola/api-types';

import {
  fetchConsumerApi,
  fetchConsumerApiResult,
  postConsumerApi,
  type ConsumerApiRequestOptions,
  type ConsumerApiResult,
} from '../consumer-api-fetch.server';
import { type ExchangeRateCard, type ExchangeRatesBatchResult } from '../consumer-api.types';

interface ExchangeRateBatchItem {
  from?: string;
  to?: string;
  rate?: number;
  code?: string;
}

export async function getExchangeCurrencies(
  options?: ConsumerApiRequestOptions,
): Promise<ConsumerExchangeCurrency[] | null> {
  return fetchConsumerApi<ConsumerExchangeCurrenciesResponse>(`/consumer/exchange/currencies`, options);
}

export async function getExchangeCurrenciesResult(
  options?: ConsumerApiRequestOptions,
): Promise<ConsumerApiResult<ConsumerExchangeCurrency[]>> {
  return fetchConsumerApiResult<ConsumerExchangeCurrenciesResponse>(`/consumer/exchange/currencies`, options);
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

  const raw = await postConsumerApi<ConsumerExchangeRatesBatchResponse>(
    `/consumer/exchange/rates/batch`,
    { pairs },
    options,
  );

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
): Promise<ConsumerExchangeRulesResponse | null> {
  return fetchConsumerApi<ConsumerExchangeRulesResponse>(
    `/consumer/exchange/rules?page=${page}&pageSize=${pageSize}`,
    options,
  );
}

export async function getExchangeRulesResult(
  page = 1,
  pageSize = 10,
  options?: ConsumerApiRequestOptions,
): Promise<ConsumerApiResult<ConsumerExchangeRulesResponse>> {
  return fetchConsumerApiResult<ConsumerExchangeRulesResponse>(
    `/consumer/exchange/rules?page=${page}&pageSize=${pageSize}`,
    options,
  );
}

export async function getScheduledConversions(
  page = 1,
  pageSize = 10,
  options?: ConsumerApiRequestOptions,
): Promise<ConsumerScheduledConversionsResponse | null> {
  return fetchConsumerApi<ConsumerScheduledConversionsResponse>(
    `/consumer/exchange/scheduled?page=${page}&pageSize=${pageSize}`,
    options,
  );
}

export async function getScheduledConversionsResult(
  page = 1,
  pageSize = 10,
  options?: ConsumerApiRequestOptions,
): Promise<ConsumerApiResult<ConsumerScheduledConversionsResponse>> {
  return fetchConsumerApiResult<ConsumerScheduledConversionsResponse>(
    `/consumer/exchange/scheduled?page=${page}&pageSize=${pageSize}`,
    options,
  );
}
