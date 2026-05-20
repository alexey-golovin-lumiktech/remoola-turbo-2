import { fetchAdminApiResult, fetchAdminApi, type AdminApiReadResult } from './core.server';
import { getDefaultLookbackIsoRange } from '../admin-format';
import {
  type ConsumerCaseResponse,
  type ConsumerContractsResponse,
  type ConsumerLedgerSummaryResponse,
  type ConsumerTimelineResponse,
  type ConsumersListResponse,
} from './types';

export async function getConsumers(params?: {
  page?: number;
  pageSize?: number;
  q?: string;
  accountType?: string;
  contractorKind?: string;
  verificationStatus?: string;
  includeDeleted?: boolean;
}): Promise<ConsumersListResponse | null> {
  const searchParams = new URLSearchParams({
    page: String(params?.page ?? 1),
    pageSize: String(params?.pageSize ?? 20),
  });
  if (params?.q?.trim()) searchParams.set(`q`, params.q.trim());
  if (params?.accountType?.trim()) searchParams.set(`accountType`, params.accountType.trim());
  if (params?.contractorKind?.trim()) searchParams.set(`contractorKind`, params.contractorKind.trim());
  if (params?.verificationStatus?.trim()) searchParams.set(`verificationStatus`, params.verificationStatus.trim());
  if (params?.includeDeleted) searchParams.set(`includeDeleted`, `true`);
  return fetchAdminApi<ConsumersListResponse>(`/admin-v2/consumers?${searchParams.toString()}`);
}

export async function getConsumerCaseResult(consumerId: string): Promise<AdminApiReadResult<ConsumerCaseResponse>> {
  if (!consumerId.trim()) return { status: `not_found` };
  return fetchAdminApiResult<ConsumerCaseResponse>(`/admin-v2/consumers/${consumerId}`);
}

export async function getConsumerContracts(params: {
  consumerId: string;
  page?: number;
  pageSize?: number;
  q?: string;
}): Promise<ConsumerContractsResponse | null> {
  if (!params.consumerId.trim()) return null;
  const searchParams = new URLSearchParams({
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 5),
  });
  if (params.q?.trim()) searchParams.set(`q`, params.q.trim());
  return fetchAdminApi<ConsumerContractsResponse>(
    `/admin-v2/consumers/${params.consumerId}/contracts?${searchParams.toString()}`,
  );
}

export async function getConsumerLedgerSummary(consumerId: string): Promise<ConsumerLedgerSummaryResponse | null> {
  if (!consumerId.trim()) return null;
  return fetchAdminApi<ConsumerLedgerSummaryResponse>(`/admin-v2/consumers/${consumerId}/ledger-summary`);
}

export async function getConsumerAuthHistory(params: {
  consumerId: string;
  page?: number;
  pageSize?: number;
  dateFrom?: string;
  dateTo?: string;
}): Promise<ConsumerTimelineResponse | null> {
  if (!params.consumerId.trim()) return null;
  const searchParams = new URLSearchParams({
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 5),
  });
  if (params.dateFrom?.trim()) searchParams.set(`dateFrom`, params.dateFrom.trim());
  if (params.dateTo?.trim()) searchParams.set(`dateTo`, params.dateTo.trim());
  return fetchAdminApi<ConsumerTimelineResponse>(
    `/admin-v2/consumers/${params.consumerId}/auth-history?${searchParams.toString()}`,
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
  if (!params.consumerId.trim()) return null;
  const dateTo = params.dateTo?.trim() || new Date().toISOString();
  const dateFrom = params.dateFrom?.trim() || getDefaultLookbackIsoRange().dateFrom;
  const searchParams = new URLSearchParams({
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 5),
    dateFrom,
    dateTo,
  });
  if (params.action?.trim()) searchParams.set(`action`, params.action.trim());
  return fetchAdminApi<ConsumerTimelineResponse>(
    `/admin-v2/consumers/${params.consumerId}/action-log?${searchParams.toString()}`,
  );
}
