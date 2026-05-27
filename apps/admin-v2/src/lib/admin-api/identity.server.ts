import { adminV2AdminIdentitySchema, adminV2ListAdminSessionsResponseSchema } from '@remoola/api-types';

import { fetchAdminApiResult, fetchAdminApi, type AdminApiReadResult } from './core.server';
import { type AdminIdentity, type ListAdminSessionsResponse } from './types';

export async function getAdminIdentity(): Promise<AdminIdentity | null> {
  return fetchAdminApi<AdminIdentity>(`/admin-v2/me`, adminV2AdminIdentitySchema);
}

export async function getAdminIdentityResult(): Promise<AdminApiReadResult<AdminIdentity>> {
  return fetchAdminApiResult<AdminIdentity>(`/admin-v2/me`, adminV2AdminIdentitySchema);
}

export async function getMyAdminSessionsResult(): Promise<AdminApiReadResult<ListAdminSessionsResponse>> {
  return fetchAdminApiResult<ListAdminSessionsResponse>(
    `/admin-v2/auth/me/sessions`,
    adminV2ListAdminSessionsResponseSchema,
  );
}
