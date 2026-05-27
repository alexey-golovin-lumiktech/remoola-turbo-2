import {
  adminV2ConsumerCaseResponseSchema,
  adminV2ConsumerContractsResponseSchema,
  adminV2ConsumerLedgerSummaryResponseSchema,
  adminV2ConsumerTimelineResponseSchema,
  adminV2ConsumersListResponseSchema,
} from '@remoola/api-types';

import { fetchAdminApiResult, fetchAdminApi, type AdminApiReadResult } from './core.server';
import { getDefaultLookbackIsoRange } from '../admin-format';
import {
  type ConsumerCaseResponse,
  type ConsumerContractsResponse,
  type ConsumerLedgerSummaryResponse,
  type ConsumerTimelineResponse,
  type ConsumersListResponse,
} from './types';
import { pathSegment, withQuery } from '../query-contract';

export async function getConsumers(params?: {
  page?: number;
  pageSize?: number;
  q?: string;
  accountType?: string;
  contractorKind?: string;
  verificationStatus?: string;
  includeDeleted?: boolean;
}): Promise<ConsumersListResponse | null> {
  return fetchAdminApi<ConsumersListResponse>(
    withQuery(`/admin-v2/consumers`, {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 20,
      q: params?.q,
      accountType: params?.accountType,
      contractorKind: params?.contractorKind,
      verificationStatus: params?.verificationStatus,
      includeDeleted: params?.includeDeleted === true ? true : undefined,
    }),
    adminV2ConsumersListResponseSchema,
  );
}

export async function getConsumerCaseResult(consumerId: string): Promise<AdminApiReadResult<ConsumerCaseResponse>> {
  const id = pathSegment(consumerId);
  if (!id) return { status: `not_found` };
  return fetchAdminApiResult<ConsumerCaseResponse>(`/admin-v2/consumers/${id}`, adminV2ConsumerCaseResponseSchema);
}

export async function getConsumerContracts(params: {
  consumerId: string;
  page?: number;
  pageSize?: number;
  q?: string;
}): Promise<ConsumerContractsResponse | null> {
  const id = pathSegment(params.consumerId);
  if (!id) return null;
  return fetchAdminApi<ConsumerContractsResponse>(
    withQuery(`/admin-v2/consumers/${id}/contracts`, {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 5,
      q: params.q,
    }),
    adminV2ConsumerContractsResponseSchema,
  );
}

export async function getConsumerLedgerSummary(consumerId: string): Promise<ConsumerLedgerSummaryResponse | null> {
  const id = pathSegment(consumerId);
  if (!id) return null;
  return fetchAdminApi<ConsumerLedgerSummaryResponse>(
    `/admin-v2/consumers/${id}/ledger-summary`,
    adminV2ConsumerLedgerSummaryResponseSchema,
  );
}

export async function getConsumerAuthHistory(params: {
  consumerId: string;
  page?: number;
  pageSize?: number;
  dateFrom?: string;
  dateTo?: string;
}): Promise<ConsumerTimelineResponse | null> {
  const id = pathSegment(params.consumerId);
  if (!id) return null;
  return fetchAdminApi<ConsumerTimelineResponse>(
    withQuery(`/admin-v2/consumers/${id}/auth-history`, {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 5,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    }),
    adminV2ConsumerTimelineResponseSchema,
  );
}

export async function getConsumerActionLog(params: {
  consumerId: string;
  page?: number;
  pageSize?: number;
  dateFrom?: string;
  dateTo?: string;
  action?: string;
}): Promise<ConsumerTimelineResponse | null> {
  const id = pathSegment(params.consumerId);
  if (!id) return null;
  const dateTo = params.dateTo?.trim() || new Date().toISOString();
  const dateFrom = params.dateFrom?.trim() || getDefaultLookbackIsoRange().dateFrom;
  return fetchAdminApi<ConsumerTimelineResponse>(
    withQuery(`/admin-v2/consumers/${id}/action-log`, {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 5,
      dateFrom,
      dateTo,
      action: params.action,
    }),
    adminV2ConsumerTimelineResponseSchema,
  );
}
