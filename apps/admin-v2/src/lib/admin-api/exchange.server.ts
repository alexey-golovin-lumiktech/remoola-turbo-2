import {
  adminV2ExchangeRateCaseResponseSchema,
  adminV2ExchangeRatesListResponseSchema,
  adminV2ExchangeRuleCaseResponseSchema,
  adminV2ExchangeRulesListResponseSchema,
  adminV2ExchangeScheduledCaseResponseSchema,
  adminV2ExchangeScheduledListResponseSchema,
} from '@remoola/api-types';

import { fetchAdminApiResult, fetchAdminApi, type AdminApiReadResult } from './core.server';
import {
  type ExchangeRateCaseResponse,
  type ExchangeRatesListResponse,
  type ExchangeRuleCaseResponse,
  type ExchangeRulesListResponse,
  type ExchangeScheduledCaseResponse,
  type ExchangeScheduledListResponse,
} from './types';
import { pathSegment, withQuery } from '../query-contract';

export async function getExchangeRates(params?: {
  page?: number;
  pageSize?: number;
  fromCurrency?: string;
  toCurrency?: string;
  provider?: string;
  status?: string;
  stale?: boolean;
}): Promise<ExchangeRatesListResponse | null> {
  return fetchAdminApi<ExchangeRatesListResponse>(
    withQuery(`/admin-v2/exchange/rates`, {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 20,
      fromCurrency: params?.fromCurrency,
      toCurrency: params?.toCurrency,
      provider: params?.provider,
      status: params?.status,
      stale: params?.stale === true ? true : undefined,
    }),
    adminV2ExchangeRatesListResponseSchema,
  );
}

export async function getExchangeRateCaseResult(rateId: string): Promise<AdminApiReadResult<ExchangeRateCaseResponse>> {
  const id = pathSegment(rateId);
  if (!id) return { status: `not_found` };
  return fetchAdminApiResult<ExchangeRateCaseResponse>(
    `/admin-v2/exchange/rates/${id}`,
    adminV2ExchangeRateCaseResponseSchema,
  );
}

export async function getExchangeRules(params?: {
  page?: number;
  pageSize?: number;
  q?: string;
  enabled?: boolean;
  fromCurrency?: string;
  toCurrency?: string;
}): Promise<ExchangeRulesListResponse | null> {
  return fetchAdminApi<ExchangeRulesListResponse>(
    withQuery(`/admin-v2/exchange/rules`, {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 20,
      q: params?.q,
      enabled: params?.enabled,
      fromCurrency: params?.fromCurrency,
      toCurrency: params?.toCurrency,
    }),
    adminV2ExchangeRulesListResponseSchema,
  );
}

export async function getExchangeRuleCaseResult(ruleId: string): Promise<AdminApiReadResult<ExchangeRuleCaseResponse>> {
  const id = pathSegment(ruleId);
  if (!id) return { status: `not_found` };
  return fetchAdminApiResult<ExchangeRuleCaseResponse>(
    `/admin-v2/exchange/rules/${id}`,
    adminV2ExchangeRuleCaseResponseSchema,
  );
}

export async function getExchangeScheduledConversions(params?: {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: string;
}): Promise<ExchangeScheduledListResponse | null> {
  return fetchAdminApi<ExchangeScheduledListResponse>(
    withQuery(`/admin-v2/exchange/scheduled`, {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 20,
      q: params?.q,
      status: params?.status,
    }),
    adminV2ExchangeScheduledListResponseSchema,
  );
}

export async function getExchangeScheduledCaseResult(
  conversionId: string,
): Promise<AdminApiReadResult<ExchangeScheduledCaseResponse>> {
  const id = pathSegment(conversionId);
  if (!id) return { status: `not_found` };
  return fetchAdminApiResult<ExchangeScheduledCaseResponse>(
    `/admin-v2/exchange/scheduled/${id}`,
    adminV2ExchangeScheduledCaseResponseSchema,
  );
}
