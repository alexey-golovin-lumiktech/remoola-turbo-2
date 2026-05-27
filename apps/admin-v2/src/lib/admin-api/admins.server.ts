import {
  adminV2AdminCaseRecordResponseSchema,
  adminV2AdminsListResponseSchema,
  adminV2ListAdminSessionsResponseSchema,
} from '@remoola/api-types';

import { fetchAdminApiResult, fetchAdminApi, type AdminApiReadResult } from './core.server';
import { type AdminCaseRecordResponse, type AdminsListResponse, type ListAdminSessionsResponse } from './types';
import { pathSegment, withQuery } from '../query-contract';

export async function getAdmins(params?: {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: string;
}): Promise<AdminsListResponse | null> {
  return fetchAdminApi<AdminsListResponse>(
    withQuery(`/admin-v2/admins`, {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 20,
      q: params?.q,
      status: params?.status,
    }),
    adminV2AdminsListResponseSchema,
  );
}

export async function getAdminCaseRecordResult(adminId: string): Promise<AdminApiReadResult<AdminCaseRecordResponse>> {
  const id = pathSegment(adminId);
  if (!id) return { status: `not_found` };
  return fetchAdminApiResult<AdminCaseRecordResponse>(`/admin-v2/admins/${id}`, adminV2AdminCaseRecordResponseSchema);
}

export async function getAdminSessionsResult(adminId: string): Promise<AdminApiReadResult<ListAdminSessionsResponse>> {
  const id = pathSegment(adminId);
  if (!id) return { status: `not_found` };
  return fetchAdminApiResult<ListAdminSessionsResponse>(
    `/admin-v2/admins/${id}/sessions`,
    adminV2ListAdminSessionsResponseSchema,
  );
}
