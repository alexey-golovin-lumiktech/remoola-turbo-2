import { fetchAdminApi } from './core.server';
import { getDefaultLookbackIsoRange } from '../admin-format';
import { type AuditListResponse } from './types';

export async function getAuthAudit(params?: {
  email?: string;
  event?: string;
  ipAddress?: string;
  page?: number;
  pageSize?: number;
  dateFrom?: string;
  dateTo?: string;
}): Promise<AuditListResponse | null> {
  const searchParams = new URLSearchParams({
    page: String(params?.page ?? 1),
    pageSize: String(params?.pageSize ?? 20),
  });
  if (params?.email?.trim()) searchParams.set(`email`, params.email.trim());
  if (params?.event?.trim()) searchParams.set(`event`, params.event.trim());
  if (params?.ipAddress?.trim()) searchParams.set(`ipAddress`, params.ipAddress.trim());
  if (params?.dateFrom?.trim()) searchParams.set(`dateFrom`, params.dateFrom.trim());
  if (params?.dateTo?.trim()) searchParams.set(`dateTo`, params.dateTo.trim());
  return fetchAdminApi<AuditListResponse>(`/admin-v2/audit/auth?${searchParams.toString()}`);
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
  const searchParams = new URLSearchParams({
    page: String(params?.page ?? 1),
    pageSize: String(params?.pageSize ?? 20),
  });
  if (params?.action?.trim()) searchParams.set(`action`, params.action.trim());
  if (params?.adminId?.trim()) searchParams.set(`adminId`, params.adminId.trim());
  if (params?.email?.trim()) searchParams.set(`email`, params.email.trim());
  if (params?.resourceId?.trim()) searchParams.set(`resourceId`, params.resourceId.trim());
  if (params?.dateFrom?.trim()) searchParams.set(`dateFrom`, params.dateFrom.trim());
  if (params?.dateTo?.trim()) searchParams.set(`dateTo`, params.dateTo.trim());
  return fetchAdminApi<AuditListResponse>(`/admin-v2/audit/admin-actions?${searchParams.toString()}`);
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
  const searchParams = new URLSearchParams({
    page: String(params?.page ?? 1),
    pageSize: String(params?.pageSize ?? 20),
    dateFrom,
    dateTo,
  });
  if (params?.consumerId?.trim()) searchParams.set(`consumerId`, params.consumerId.trim());
  if (params?.action?.trim()) searchParams.set(`action`, params.action.trim());
  return fetchAdminApi<AuditListResponse>(`/admin-v2/audit/consumer-actions?${searchParams.toString()}`);
}
