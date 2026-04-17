import 'server-only';

import { fetchConsumerApi, type ConsumerApiRequestOptions } from '../consumer-api-fetch.server';
import { type DocumentsResponse } from '../consumer-api.types';
import { normalizeDocumentDownloadUrl } from '../document-download-url';

export async function getDocuments(
  page = 1,
  pageSize = 20,
  options?: ConsumerApiRequestOptions,
  filters?: {
    contactId?: string;
  },
): Promise<DocumentsResponse | null> {
  const searchParams = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (filters?.contactId?.trim()) {
    searchParams.set(`contactId`, filters.contactId.trim());
  }
  const documents = await fetchConsumerApi<DocumentsResponse>(
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
