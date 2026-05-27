import { adminV2AuditListResponseSchema } from '@remoola/api-types';

import { fetchAdminApi } from './core.server';
import { getDefaultLookbackIsoRange } from '../admin-format';
import { type AuditListResponse } from './types';
import { withQuery } from '../query-contract';

export async function getAuthAudit(params?: {
  email?: string;
  event?: string;
  ipAddress?: string;
  page?: number;
  pageSize?: number;
  dateFrom?: string;
  dateTo?: string;
}): Promise<AuditListResponse | null> {
  return fetchAdminApi<AuditListResponse>(
    withQuery(`/admin-v2/audit/auth`, {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 20,
      email: params?.email,
      event: params?.event,
      ipAddress: params?.ipAddress,
      dateFrom: params?.dateFrom,
      dateTo: params?.dateTo,
    }),
    adminV2AuditListResponseSchema,
  );
}

export async function getAdminActionAudit(params?: {
  action?: string;
  adminId?: string;
  email?: string;
  resourceId?: string;
  page?: number;
  pageSize?: number;
  dateFrom?: string;
  dateTo?: string;
}): Promise<AuditListResponse | null> {
  return fetchAdminApi<AuditListResponse>(
    withQuery(`/admin-v2/audit/admin-actions`, {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 20,
      action: params?.action,
      adminId: params?.adminId,
      email: params?.email,
      resourceId: params?.resourceId,
      dateFrom: params?.dateFrom,
      dateTo: params?.dateTo,
    }),
    adminV2AuditListResponseSchema,
  );
}

export async function getConsumerActionAudit(params?: {
  consumerId?: string;
  action?: string;
  page?: number;
  pageSize?: number;
  dateFrom?: string;
  dateTo?: string;
}): Promise<AuditListResponse | null> {
  const dateTo = params?.dateTo?.trim() || new Date().toISOString();
  const dateFrom = params?.dateFrom?.trim() || getDefaultLookbackIsoRange().dateFrom;
  return fetchAdminApi<AuditListResponse>(
    withQuery(`/admin-v2/audit/consumer-actions`, {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 20,
      dateFrom,
      dateTo,
      consumerId: params?.consumerId,
      action: params?.action,
    }),
    adminV2AuditListResponseSchema,
  );
}
