import 'server-only';

import { cookies } from 'next/headers';

import {
  fetchConsumerApi,
  isRedirectControlFlow,
  redirectOnUnauthorized,
  type ConsumerApiRequestOptions,
} from './consumer-api-fetch.server';
import {
  type BalanceResponse,
  type ContactDetailsResponse,
  type ContactResponse,
  type ContactsResponse,
  type ContactSearchItem,
  type ContractDetailsResponse,
  type ContractsResponse,
  type DashboardData,
  type DashboardDataResult,
  type DocumentsResponse,
  type ExchangeCurrency,
  type ExchangeRate,
  type ExchangeRateCard,
  type ExchangeRatesBatchResult,
  type ExchangeRule,
  type PaymentHistoryResponse,
  type PaymentMethodsResponse,
  type PaymentsResponse,
  type PaymentViewResponse,
  type ProfileResponse,
  type ScheduledConversion,
  type SettingsResponse,
} from './consumer-api.types';
import { buildConsumerMutationHeaders, buildConsumerReadHeaders } from './consumer-auth-headers.server';
import { normalizeDocumentDownloadUrl } from './document-download-url';
import { getEnv } from './env.server';

interface ExchangeRateBatchItem {
  from?: string;
  to?: string;
  rate?: number;
  code?: string;
}

export type {
  BalanceResponse,
  ContactDetailsResponse,
  ContactResponse,
  ContactsResponse,
  ContactSearchItem,
  ContractDetailsResponse,
  ContractsResponse,
  DashboardData,
  DashboardDataResult,
  DocumentsResponse,
  ExchangeCurrency,
  ExchangeRate,
  ExchangeRateCard,
  ExchangeRatesBatchResult,
  ExchangeRule,
  PaymentHistoryResponse,
  PaymentMethodsResponse,
  PaymentsResponse,
  PaymentViewResponse,
  ProfileResponse,
  ScheduledConversion,
  SettingsResponse,
};

async function postConsumerApi<T>(path: string, body: unknown, options?: ConsumerApiRequestOptions): Promise<T | null> {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) return null;

  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();
    const response = await fetch(`${baseUrl}${path}`, {
      method: `POST`,
      headers: buildConsumerMutationHeaders(cookieHeader, {
        'content-type': `application/json`,
      }),
      body: JSON.stringify(body),
      cache: `no-store`,
      signal: AbortSignal.timeout(15000),
    });

    if (response.status === 401) {
      redirectOnUnauthorized(options);
      return null;
    }
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch (error) {
    if (isRedirectControlFlow(error)) throw error;
    return null;
  }
}

async function fetchConsumerApiResult<T>(
  path: string,
  options?: ConsumerApiRequestOptions,
): Promise<{ data: T | null; unavailable: boolean }> {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    return { data: null, unavailable: true };
  }

  try {
    const cookieStore = await cookies();
    const response = await fetch(`${baseUrl}${path}`, {
      method: `GET`,
      headers: buildConsumerReadHeaders(cookieStore.toString()),
      cache: `no-store`,
      signal: AbortSignal.timeout(15000),
    });

    if (response.status === 401) {
      redirectOnUnauthorized(options);
      return { data: null, unavailable: false };
    }
    if (!response.ok) {
      return { data: null, unavailable: true };
    }

    return {
      data: (await response.json()) as T,
      unavailable: false,
    };
  } catch (error) {
    if (isRedirectControlFlow(error)) throw error;
    return { data: null, unavailable: true };
  }
}

function normalizePendingWithdrawals(
  raw: PaymentHistoryResponse | null,
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

async function getPendingWithdrawals(options?: ConsumerApiRequestOptions): Promise<PaymentHistoryResponse | null> {
  const searchParams = new URLSearchParams({
    direction: `OUTCOME`,
    status: `PENDING`,
    type: `USER_PAYOUT`,
    limit: `5`,
  });
  return fetchConsumerApi<PaymentHistoryResponse>(`/consumer/payments/history?${searchParams.toString()}`, options);
}

export async function getDashboardData(options?: ConsumerApiRequestOptions): Promise<DashboardDataResult> {
  const [dashboardResult, pendingWithdrawals] = await Promise.all([
    fetchConsumerApiResult<DashboardData>(`/consumer/dashboard`, options),
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

export async function getPayments(
  params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    type?: string;
    role?: string;
    search?: string;
  },
  options?: ConsumerApiRequestOptions,
): Promise<PaymentsResponse | null> {
  const searchParams = new URLSearchParams({
    page: String(params?.page ?? 1),
    pageSize: String(params?.pageSize ?? 20),
  });
  if (params?.status) searchParams.set(`status`, params.status);
  if (params?.type) searchParams.set(`type`, params.type);
  if (params?.role) searchParams.set(`role`, params.role);
  if (params?.search) searchParams.set(`search`, params.search);
  return fetchConsumerApi<PaymentsResponse>(`/consumer/payments?${searchParams.toString()}`, options);
}

export async function getPaymentView(
  paymentRequestId: string,
  options?: ConsumerApiRequestOptions,
): Promise<PaymentViewResponse | null> {
  if (!paymentRequestId.trim()) return null;
  const payment = await fetchConsumerApi<PaymentViewResponse>(`/consumer/payments/${paymentRequestId}`, options);
  if (!payment) return null;

  return {
    ...payment,
    attachments: payment.attachments.map((attachment) => ({
      ...attachment,
      downloadUrl: normalizeDocumentDownloadUrl(attachment.downloadUrl, attachment.id),
    })),
  };
}

export { getDocuments } from './queries/documents.server';
export { getAvailableBalances, getBalances, getPaymentMethods } from './queries/banking.server';
export {
  findContactByExactEmail,
  getContact,
  getContactDetails,
  getContacts,
  searchContacts,
} from './queries/contacts.server';
export { getContractDetails, getContracts } from './queries/contracts.server';
export { getProfile, getSettings } from './queries/settings.server';

export async function getPaymentHistory(
  params?: {
    limit?: number;
    offset?: number;
    direction?: string;
    status?: string;
    type?: string;
  },
  options?: ConsumerApiRequestOptions,
): Promise<PaymentHistoryResponse | null> {
  const searchParams = new URLSearchParams({
    limit: String(params?.limit ?? 20),
    offset: String(params?.offset ?? 0),
  });
  if (params?.direction) searchParams.set(`direction`, params.direction);
  if (params?.status) searchParams.set(`status`, params.status);
  if (params?.type) searchParams.set(`type`, params.type);
  return fetchConsumerApi<PaymentHistoryResponse>(`/consumer/payments/history?${searchParams.toString()}`, options);
}

export async function getExchangeCurrencies(options?: ConsumerApiRequestOptions): Promise<ExchangeCurrency[] | null> {
  const raw = await fetchConsumerApi<unknown>(`/consumer/exchange/currencies`, options);
  if (!Array.isArray(raw)) return null;
  return raw.map((code) => {
    const currencyCode = String(code);
    return {
      code: currencyCode,
      symbol: currencyCode.slice(0, 1),
    };
  });
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
