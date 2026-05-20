import { fetchAdminApiResult, fetchAdminApi, type AdminApiReadResult } from './core.server';
import {
  type ExchangeRateCaseResponse,
  type ExchangeRatesListResponse,
  type ExchangeRuleCaseResponse,
  type ExchangeRulesListResponse,
  type ExchangeScheduledCaseResponse,
  type ExchangeScheduledListResponse,
} from './types';

export async function getExchangeRates(params?: {
  page?: number;
  pageSize?: number;
  fromCurrency?: string;
  toCurrency?: string;
  provider?: string;
  status?: string;
  stale?: boolean;
}): Promise<ExchangeRatesListResponse | null> {
  const searchParams = new URLSearchParams({
    page: String(params?.page ?? 1),
    pageSize: String(params?.pageSize ?? 20),
  });
  if (params?.fromCurrency?.trim()) searchParams.set(`fromCurrency`, params.fromCurrency.trim());
  if (params?.toCurrency?.trim()) searchParams.set(`toCurrency`, params.toCurrency.trim());
  if (params?.provider?.trim()) searchParams.set(`provider`, params.provider.trim());
  if (params?.status?.trim()) searchParams.set(`status`, params.status.trim());
  if (params?.stale) searchParams.set(`stale`, `true`);
  return fetchAdminApi<ExchangeRatesListResponse>(`/admin-v2/exchange/rates?${searchParams.toString()}`);
}

export async function getExchangeRateCaseResult(rateId: string): Promise<AdminApiReadResult<ExchangeRateCaseResponse>> {
  if (!rateId.trim()) return { status: `not_found` };
  return fetchAdminApiResult<ExchangeRateCaseResponse>(`/admin-v2/exchange/rates/${rateId}`);
}

export async function getExchangeRules(params?: {
  page?: number;
  pageSize?: number;
  q?: string;
  enabled?: boolean;
  fromCurrency?: string;
  toCurrency?: string;
}): Promise<ExchangeRulesListResponse | null> {
  const searchParams = new URLSearchParams({
    page: String(params?.page ?? 1),
    pageSize: String(params?.pageSize ?? 20),
  });
  if (params?.q?.trim()) searchParams.set(`q`, params.q.trim());
  if (typeof params?.enabled === `boolean`) searchParams.set(`enabled`, String(params.enabled));
  if (params?.fromCurrency?.trim()) searchParams.set(`fromCurrency`, params.fromCurrency.trim());
  if (params?.toCurrency?.trim()) searchParams.set(`toCurrency`, params.toCurrency.trim());
  return fetchAdminApi<ExchangeRulesListResponse>(`/admin-v2/exchange/rules?${searchParams.toString()}`);
}

export async function getExchangeRuleCaseResult(ruleId: string): Promise<AdminApiReadResult<ExchangeRuleCaseResponse>> {
  if (!ruleId.trim()) return { status: `not_found` };
  return fetchAdminApiResult<ExchangeRuleCaseResponse>(`/admin-v2/exchange/rules/${ruleId}`);
}

export async function getExchangeScheduledConversions(params?: {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: string;
}): Promise<ExchangeScheduledListResponse | null> {
  const searchParams = new URLSearchParams({
    page: String(params?.page ?? 1),
    pageSize: String(params?.pageSize ?? 20),
  });
  if (params?.q?.trim()) searchParams.set(`q`, params.q.trim());
  if (params?.status?.trim()) searchParams.set(`status`, params.status.trim());
  return fetchAdminApi<ExchangeScheduledListResponse>(`/admin-v2/exchange/scheduled?${searchParams.toString()}`);
}

export async function getExchangeScheduledCaseResult(
  conversionId: string,
): Promise<AdminApiReadResult<ExchangeScheduledCaseResponse>> {
  if (!conversionId.trim()) return { status: `not_found` };
  return fetchAdminApiResult<ExchangeScheduledCaseResponse>(`/admin-v2/exchange/scheduled/${conversionId}`);
}
