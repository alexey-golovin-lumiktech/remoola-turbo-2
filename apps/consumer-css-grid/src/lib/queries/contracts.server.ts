import 'server-only';

import { fetchConsumerApi, type ConsumerApiRequestOptions } from '../consumer-api-fetch.server';
import { type ContractDetailsResponse, type ContractsResponse } from '../consumer-api.types';
import { normalizeDocumentDownloadUrl } from '../document-download-url';

export async function getContracts(
  params?: {
    page?: number;
    pageSize?: number;
    query?: string;
    status?: string;
    hasDocuments?: string;
    hasPayments?: string;
    sort?: string;
  },
  options?: ConsumerApiRequestOptions,
): Promise<ContractsResponse | null> {
  const searchParams = new URLSearchParams({
    page: String(params?.page ?? 1),
    pageSize: String(params?.pageSize ?? 10),
  });
  if (params?.query) searchParams.set(`query`, params.query);
  if (params?.status && params.status !== `all`) searchParams.set(`status`, params.status);
  if (params?.hasDocuments && params.hasDocuments !== `all`) searchParams.set(`hasDocuments`, params.hasDocuments);
  if (params?.hasPayments && params.hasPayments !== `all`) searchParams.set(`hasPayments`, params.hasPayments);
  if (params?.sort && params.sort !== `recent_activity`) searchParams.set(`sort`, params.sort);
  return fetchConsumerApi<ContractsResponse>(`/consumer/contracts?${searchParams.toString()}`, options);
}

export async function getContractDetails(contractId: string): Promise<ContractDetailsResponse | null> {
  const id = contractId.trim();
  if (!id) return null;
  const contract = await fetchConsumerApi<ContractDetailsResponse>(`/consumer/contracts/${id}/details`);
  if (!contract) return null;

  return {
    ...contract,
    documents: contract.documents.map((document) => ({
      ...document,
      downloadUrl: normalizeDocumentDownloadUrl(document.downloadUrl, document.id),
    })),
  };
}
