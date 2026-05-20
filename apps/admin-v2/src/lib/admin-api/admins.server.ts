import { fetchAdminApiResult, fetchAdminApi, type AdminApiReadResult } from './core.server';
import { type AdminCaseRecordResponse, type AdminsListResponse, type ListAdminSessionsResponse } from './types';

export async function getAdmins(params?: {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: string;
}): Promise<AdminsListResponse | null> {
  const searchParams = new URLSearchParams({
    page: String(params?.page ?? 1),
    pageSize: String(params?.pageSize ?? 20),
  });
  if (params?.q?.trim()) searchParams.set(`q`, params.q.trim());
  if (params?.status?.trim()) searchParams.set(`status`, params.status.trim());
  return fetchAdminApi<AdminsListResponse>(`/admin-v2/admins?${searchParams.toString()}`);
}

export async function getAdminCaseRecordResult(adminId: string): Promise<AdminApiReadResult<AdminCaseRecordResponse>> {
  if (!adminId.trim()) return { status: `not_found` };
  return fetchAdminApiResult<AdminCaseRecordResponse>(`/admin-v2/admins/${adminId}`);
}

export async function getAdminSessionsResult(adminId: string): Promise<AdminApiReadResult<ListAdminSessionsResponse>> {
  if (!adminId.trim()) return { status: `not_found` };
  return fetchAdminApiResult<ListAdminSessionsResponse>(`/admin-v2/admins/${adminId}/sessions`);
}
