import {
  adminV2DocumentCaseResponseSchema,
  adminV2DocumentTagsResponseSchema,
  adminV2DocumentsListResponseSchema,
} from '@remoola/api-types';

import { fetchAdminApiResult, fetchAdminApi, type AdminApiReadResult } from './core.server';
import { type DocumentCaseResponse, type DocumentTagsResponse, type DocumentsListResponse } from './types';
import { pathSegment, withQuery } from '../query-contract';

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
  return fetchAdminApi<DocumentsListResponse>(
    withQuery(`/admin-v2/documents`, {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 20,
      q: params?.q,
      consumerId: params?.consumerId,
      access: params?.access,
      mimetype: params?.mimetype,
      sizeMin: params?.sizeMin,
      sizeMax: params?.sizeMax,
      createdFrom: params?.createdFrom,
      createdTo: params?.createdTo,
      paymentRequestId: params?.paymentRequestId,
      tag: params?.tag,
      tagId: params?.tagId,
      includeDeleted: params?.includeDeleted === true ? true : undefined,
    }),
    adminV2DocumentsListResponseSchema,
  );
}

export async function getDocumentCaseResult(documentId: string): Promise<AdminApiReadResult<DocumentCaseResponse>> {
  const id = pathSegment(documentId);
  if (!id) return { status: `not_found` };
  return fetchAdminApiResult<DocumentCaseResponse>(`/admin-v2/documents/${id}`, adminV2DocumentCaseResponseSchema);
}

export async function getDocumentTags(): Promise<DocumentTagsResponse | null> {
  return fetchAdminApi<DocumentTagsResponse>(`/admin-v2/documents/tags`, adminV2DocumentTagsResponseSchema);
}
