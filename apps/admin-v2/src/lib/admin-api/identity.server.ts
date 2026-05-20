import { fetchAdminApiResult, fetchAdminApi, type AdminApiReadResult } from './core.server';
import { type AdminIdentity, type ListAdminSessionsResponse } from './types';

export async function getAdminIdentity(): Promise<AdminIdentity | null> {
  return fetchAdminApi<AdminIdentity>(`/admin-v2/me`);
}

export async function getAdminIdentityResult(): Promise<AdminApiReadResult<AdminIdentity>> {
  return fetchAdminApiResult<AdminIdentity>(`/admin-v2/me`);
}

export async function getMyAdminSessionsResult(): Promise<AdminApiReadResult<ListAdminSessionsResponse>> {
  return fetchAdminApiResult<ListAdminSessionsResponse>(`/admin-v2/auth/me/sessions`);
}
