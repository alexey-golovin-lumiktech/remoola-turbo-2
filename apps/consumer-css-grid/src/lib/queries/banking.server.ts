import 'server-only';

import { type ConsumerBalanceResponse, type ConsumerPaymentMethodsResponse } from '@remoola/api-types';

import {
  fetchConsumerApi,
  fetchConsumerApiResult,
  type ConsumerApiRequestOptions,
  type ConsumerApiResult,
} from '../consumer-api-fetch.server';
function majorBalanceToMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}

function normalizeBalanceResponse(raw: ConsumerBalanceResponse): ConsumerBalanceResponse {
  return Object.fromEntries(
    Object.entries(raw).map(([currency, amount]) => [currency, majorBalanceToMinorUnits(Number(amount))]),
  ) as ConsumerBalanceResponse;
}

export async function getPaymentMethods(
  options?: ConsumerApiRequestOptions,
): Promise<ConsumerPaymentMethodsResponse | null> {
  return fetchConsumerApi<ConsumerPaymentMethodsResponse>(`/consumer/payment-methods`, options);
}

export async function getBalances(options?: ConsumerApiRequestOptions): Promise<ConsumerBalanceResponse | null> {
  const raw = await fetchConsumerApi<ConsumerBalanceResponse>(`/consumer/payments/balance`, options);
  if (!raw) return null;
  return normalizeBalanceResponse(raw);
}

export async function getAvailableBalances(
  options?: ConsumerApiRequestOptions,
): Promise<ConsumerBalanceResponse | null> {
  const raw = await fetchConsumerApi<ConsumerBalanceResponse>(`/consumer/payments/balance/available`, options);
  if (!raw) return null;
  return normalizeBalanceResponse(raw);
}

export async function getAvailableBalancesResult(
  options?: ConsumerApiRequestOptions,
): Promise<ConsumerApiResult<ConsumerBalanceResponse>> {
  const result = await fetchConsumerApiResult<ConsumerBalanceResponse>(`/consumer/payments/balance/available`, options);
  if (!result.data) return result;
  return {
    ...result,
    data: normalizeBalanceResponse(result.data),
  };
}
