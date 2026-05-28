import 'server-only';

import { type ConsumerDocumentsResponse } from '@remoola/api-types';

import {
  fetchConsumerApi,
  fetchConsumerApiResult,
  type ConsumerApiRequestOptions,
  type ConsumerApiResult,
} from '../consumer-api-fetch.server';
import { normalizeDocumentDownloadUrl } from '../document-download-url';

export async function getDocuments(
  page = 1,
  pageSize = 20,
  options?: ConsumerApiRequestOptions,
  filters?: {
    contactId?: string;
  },
): Promise<ConsumerDocumentsResponse | null> {
  const searchParams = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (filters?.contactId?.trim()) {
    searchParams.set(`contactId`, filters.contactId.trim());
  }
  const documents = await fetchConsumerApi<ConsumerDocumentsResponse>(
    `/consumer/documents?${searchParams.toString()}`,
    options,
  );
  if (!documents) return null;

  return {
    ...documents,
    items: documents.items.map((document) => ({
      ...document,
      downloadUrl: normalizeDocumentDownloadUrl(document.downloadUrl, document.id),
    })),
  };
}

export async function getDocumentsResult(
  page = 1,
  pageSize = 20,
  options?: ConsumerApiRequestOptions,
  filters?: {
    contactId?: string;
  },
): Promise<ConsumerApiResult<ConsumerDocumentsResponse>> {
  const searchParams = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (filters?.contactId?.trim()) {
    searchParams.set(`contactId`, filters.contactId.trim());
  }
  const result = await fetchConsumerApiResult<ConsumerDocumentsResponse>(
    `/consumer/documents?${searchParams.toString()}`,
    options,
  );
  if (!result.data) return result;

  return {
    ...result,
    data: {
      ...result.data,
      items: result.data.items.map((document) => ({
        ...document,
        downloadUrl: normalizeDocumentDownloadUrl(document.downloadUrl, document.id),
      })),
    },
  };
}
