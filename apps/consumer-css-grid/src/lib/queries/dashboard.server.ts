import 'server-only';

import { type ConsumerDashboardData, type ConsumerPaymentHistoryResponse } from '@remoola/api-types';

import { fetchConsumerApi, fetchConsumerApiResult, type ConsumerApiRequestOptions } from '../consumer-api-fetch.server';
import { type DashboardData, type DashboardDataResult } from '../consumer-api.types';

function normalizePendingWithdrawals(
  raw: ConsumerPaymentHistoryResponse | null,
): NonNullable<DashboardData[`pendingWithdrawals`]> {
  if (!raw) {
    return { items: [], total: 0 };
  }

  return {
    items: raw.items
      .filter((item) => item.type === `USER_PAYOUT`)
      .map((item) => ({
        id: item.id,
        ledgerId: item.ledgerId,
        paymentRequestId: item.paymentRequestId,
        amount: Math.abs(item.amount),
        currencyCode: item.currencyCode,
        status: item.status,
        createdAt: item.createdAt,
        paymentMethodLabel: item.paymentMethodLabel,
      })),
    total: raw.total,
  };
}

async function getPendingWithdrawals(
  options?: ConsumerApiRequestOptions,
): Promise<ConsumerPaymentHistoryResponse | null> {
  const searchParams = new URLSearchParams({
    direction: `OUTCOME`,
    status: `PENDING`,
    type: `USER_PAYOUT`,
    limit: `5`,
  });
  return fetchConsumerApi<ConsumerPaymentHistoryResponse>(
    `/consumer/payments/history?${searchParams.toString()}`,
    options,
  );
}

export async function getDashboardData(options?: ConsumerApiRequestOptions): Promise<DashboardDataResult> {
  const [dashboardResult, pendingWithdrawals] = await Promise.all([
    fetchConsumerApiResult<ConsumerDashboardData>(`/consumer/dashboard`, options),
    getPendingWithdrawals(options),
  ]);

  if (!dashboardResult.data) {
    return dashboardResult;
  }

  return {
    ...dashboardResult,
    data: {
      ...dashboardResult.data,
      pendingWithdrawals: normalizePendingWithdrawals(pendingWithdrawals),
    },
  };
}
