import 'server-only';

import {
  type ConsumerPaymentHistoryResponse,
  type ConsumerPaymentsResponse,
  type ConsumerPaymentViewResponse,
} from '@remoola/api-types';

import { encodeApiPathSegment } from '../api-path';
import {
  fetchConsumerApi,
  fetchConsumerApiResult,
  type ConsumerApiRequestOptions,
  type ConsumerApiResult,
} from '../consumer-api-fetch.server';
import { normalizeDocumentDownloadUrl } from '../document-download-url';

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
): Promise<ConsumerPaymentsResponse | null> {
  const searchParams = new URLSearchParams({
    page: String(params?.page ?? 1),
    pageSize: String(params?.pageSize ?? 20),
  });
  if (params?.status) searchParams.set(`status`, params.status);
  if (params?.type) searchParams.set(`type`, params.type);
  if (params?.role) searchParams.set(`role`, params.role);
  if (params?.search) searchParams.set(`search`, params.search);
  return fetchConsumerApi<ConsumerPaymentsResponse>(`/consumer/payments?${searchParams.toString()}`, options);
}

export async function getPaymentsResult(
  params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    type?: string;
    role?: string;
    search?: string;
  },
  options?: ConsumerApiRequestOptions,
): Promise<ConsumerApiResult<ConsumerPaymentsResponse>> {
  const searchParams = new URLSearchParams({
    page: String(params?.page ?? 1),
    pageSize: String(params?.pageSize ?? 20),
  });
  if (params?.status) searchParams.set(`status`, params.status);
  if (params?.type) searchParams.set(`type`, params.type);
  if (params?.role) searchParams.set(`role`, params.role);
  if (params?.search) searchParams.set(`search`, params.search);
  return fetchConsumerApiResult<ConsumerPaymentsResponse>(`/consumer/payments?${searchParams.toString()}`, options);
}

export async function getPaymentView(
  paymentRequestId: string,
  options?: ConsumerApiRequestOptions,
): Promise<ConsumerPaymentViewResponse | null> {
  const id = paymentRequestId.trim();
  if (!id) return null;
  const payment = await fetchConsumerApi<ConsumerPaymentViewResponse>(
    `/consumer/payments/${encodeApiPathSegment(id)}`,
    options,
  );
  if (!payment) return null;

  return {
    ...payment,
    attachments: payment.attachments.map((attachment) => ({
      ...attachment,
      downloadUrl: normalizeDocumentDownloadUrl(attachment.downloadUrl, attachment.id),
    })),
  };
}

export async function getPaymentHistory(
  params?: {
    limit?: number;
    offset?: number;
    direction?: string;
    status?: string;
    type?: string;
  },
  options?: ConsumerApiRequestOptions,
): Promise<ConsumerPaymentHistoryResponse | null> {
  const searchParams = new URLSearchParams({
    limit: String(params?.limit ?? 20),
    offset: String(params?.offset ?? 0),
  });
  if (params?.direction) searchParams.set(`direction`, params.direction);
  if (params?.status) searchParams.set(`status`, params.status);
  if (params?.type) searchParams.set(`type`, params.type);
  return fetchConsumerApi<ConsumerPaymentHistoryResponse>(
    `/consumer/payments/history?${searchParams.toString()}`,
    options,
  );
}
