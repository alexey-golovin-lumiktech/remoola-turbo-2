import {
  adminV2LedgerAnomalyListResponseSchema,
  adminV2LedgerAnomalySummaryResponseSchema,
  adminV2LedgerDisputesResponseSchema,
  adminV2LedgerEntriesListResponseSchema,
  adminV2LedgerEntryCaseResponseSchema,
} from '@remoola/api-types';

import { fetchAdminApiResult, fetchAdminApi, type AdminApiReadResult } from './core.server';
import { dateSearchParam, pathSegment, withQuery } from '../query-contract';
import {
  type AdminV2LedgerDisputesQuery,
  type AdminV2LedgerEntriesListQuery,
  type LedgerAnomalyListResponse,
  type LedgerAnomalySummaryResponse,
  type LedgerDisputesResponse,
  type LedgerEntriesListResponse,
  type LedgerEntryCaseResponse,
} from './types';

export async function getLedgerAnomaliesSummary(): Promise<LedgerAnomalySummaryResponse | null> {
  return fetchAdminApi<LedgerAnomalySummaryResponse>(
    `/admin-v2/ledger/anomalies/summary`,
    adminV2LedgerAnomalySummaryResponseSchema,
  );
}

export async function getLedgerAnomalies(params: {
  className: string;
  dateFrom: string;
  dateTo?: string;
  cursor?: string;
  limit?: number;
}): Promise<LedgerAnomalyListResponse | null> {
  return fetchAdminApi<LedgerAnomalyListResponse>(
    withQuery(`/admin-v2/ledger/anomalies`, {
      class: params.className,
      dateFrom: dateSearchParam(params.dateFrom),
      dateTo: dateSearchParam(params.dateTo),
      cursor: params.cursor,
      limit: params.limit ?? 50,
    }),
    adminV2LedgerAnomalyListResponseSchema,
  );
}

export async function getLedgerEntries(
  params?: AdminV2LedgerEntriesListQuery,
): Promise<LedgerEntriesListResponse | null> {
  return fetchAdminApi<LedgerEntriesListResponse>(
    withQuery(`/admin-v2/ledger`, {
      limit: params?.limit ?? 25,
      cursor: params?.cursor,
      q: params?.q,
      type: params?.type,
      status: params?.status,
      currencyCode: params?.currencyCode,
      paymentRequestId: params?.paymentRequestId,
      consumerId: params?.consumerId,
      amountSign: params?.amountSign,
      dateFrom: dateSearchParam(params?.dateFrom),
      dateTo: dateSearchParam(params?.dateTo),
    }),
    adminV2LedgerEntriesListResponseSchema,
  );
}

export async function getLedgerEntryCaseResult(
  ledgerEntryId: string,
): Promise<AdminApiReadResult<LedgerEntryCaseResponse>> {
  const id = pathSegment(ledgerEntryId);
  if (!id) return { status: `not_found` };
  return fetchAdminApiResult<LedgerEntryCaseResponse>(`/admin-v2/ledger/${id}`, adminV2LedgerEntryCaseResponseSchema);
}

export async function getLedgerDisputes(params?: AdminV2LedgerDisputesQuery): Promise<LedgerDisputesResponse | null> {
  return fetchAdminApi<LedgerDisputesResponse>(
    withQuery(`/admin-v2/ledger/disputes`, {
      limit: params?.limit ?? 25,
      cursor: params?.cursor,
      paymentRequestId: params?.paymentRequestId,
      consumerId: params?.consumerId,
      q: params?.q,
      dateFrom: dateSearchParam(params?.dateFrom),
      dateTo: dateSearchParam(params?.dateTo),
    }),
    adminV2LedgerDisputesResponseSchema,
  );
}
