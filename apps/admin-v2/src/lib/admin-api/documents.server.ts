import { fetchAdminApiResult, fetchAdminApi, type AdminApiReadResult } from './core.server';
import { type DocumentCaseResponse, type DocumentTagsResponse, type DocumentsListResponse } from './types';

export async function getDocuments(params?: {
  page?: number;
  pageSize?: number;
  q?: string;
  consumerId?: string;
  access?: string;
  mimetype?: string;
  sizeMin?: number;
  sizeMax?: number;
  createdFrom?: string;
  createdTo?: string;
  paymentRequestId?: string;
  tag?: string;
  tagId?: string;
  includeDeleted?: boolean;
}): Promise<DocumentsListResponse | null> {
  const searchParams = new URLSearchParams({
    page: String(params?.page ?? 1),
    pageSize: String(params?.pageSize ?? 20),
  });
  if (params?.q?.trim()) searchParams.set(`q`, params.q.trim());
  if (params?.consumerId?.trim()) searchParams.set(`consumerId`, params.consumerId.trim());
  if (params?.access?.trim()) searchParams.set(`access`, params.access.trim());
  if (params?.mimetype?.trim()) searchParams.set(`mimetype`, params.mimetype.trim());
  if (Number.isFinite(params?.sizeMin)) searchParams.set(`sizeMin`, String(params?.sizeMin));
  if (Number.isFinite(params?.sizeMax)) searchParams.set(`sizeMax`, String(params?.sizeMax));
  if (params?.createdFrom?.trim()) searchParams.set(`createdFrom`, params.createdFrom.trim());
  if (params?.createdTo?.trim()) searchParams.set(`createdTo`, params.createdTo.trim());
  if (params?.paymentRequestId?.trim()) searchParams.set(`paymentRequestId`, params.paymentRequestId.trim());
  if (params?.tag?.trim()) searchParams.set(`tag`, params.tag.trim());
  if (params?.tagId?.trim()) searchParams.set(`tagId`, params.tagId.trim());
  if (params?.includeDeleted) searchParams.set(`includeDeleted`, `true`);
  return fetchAdminApi<DocumentsListResponse>(`/admin-v2/documents?${searchParams.toString()}`);
}

export async function getDocumentCaseResult(documentId: string): Promise<AdminApiReadResult<DocumentCaseResponse>> {
  if (!documentId.trim()) return { status: `not_found` };
  return fetchAdminApiResult<DocumentCaseResponse>(`/admin-v2/documents/${documentId}`);
}

export async function getDocumentTags(): Promise<DocumentTagsResponse | null> {
  return fetchAdminApi<DocumentTagsResponse>(`/admin-v2/documents/tags`);
}
