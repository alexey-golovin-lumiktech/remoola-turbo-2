import 'server-only';

import { fetchConsumerApi, type ConsumerApiRequestOptions } from '../consumer-api-fetch.server';
import { type BalanceResponse, type PaymentMethodsResponse } from '../consumer-api.types';

// Balance endpoints return major units; UI balance state stays in minor units.
function majorBalanceToMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}

function normalizeBalanceResponse(raw: BalanceResponse): BalanceResponse {
  return Object.fromEntries(
    Object.entries(raw).map(([currency, amount]) => [currency, majorBalanceToMinorUnits(Number(amount))]),
  ) as BalanceResponse;
}

export async function getPaymentMethods(options?: ConsumerApiRequestOptions): Promise<PaymentMethodsResponse | null> {
  return fetchConsumerApi<PaymentMethodsResponse>(`/consumer/payment-methods`, options);
}

export async function getBalances(options?: ConsumerApiRequestOptions): Promise<BalanceResponse | null> {
  const raw = await fetchConsumerApi<BalanceResponse>(`/consumer/payments/balance`, options);
  if (!raw) return null;
  return normalizeBalanceResponse(raw);
}

export async function getAvailableBalances(options?: ConsumerApiRequestOptions): Promise<BalanceResponse | null> {
  const raw = await fetchConsumerApi<BalanceResponse>(`/consumer/payments/balance/available`, options);
  if (!raw) return null;
  return normalizeBalanceResponse(raw);
}
