import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { getEnv } from './env.server';
import { getRequestOrigin } from './request-origin';

export type AdminIdentity = {
  id: string;
  email: string;
  type: string;
  role: string | null;
  phase: string;
  capabilities: string[];
  workspaces: string[];
};

export type ConsumersListResponse = {
  items: Array<{
    id: string;
    email: string;
    accountType: string;
    contractorKind: string | null;
    verificationStatus: string;
    stripeIdentityStatus: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    displayName: string | null;
    adminFlags: Array<{ id: string; flag: string }>;
    _count: {
      adminNotes: number;
      adminFlags: number;
    };
    summary: {
      notesCount: number;
      activeFlagsCount: number;
      deleted: boolean;
    };
  }>;
  total: number;
  page: number;
  pageSize: number;
};

export type ConsumerCaseResponse = {
  id: string;
  email: string;
  accountType: string;
  contractorKind: string | null;
  verified: boolean | null;
  legalVerified: boolean | null;
  verificationStatus: string;
  verificationReason: string | null;
  verificationUpdatedAt: string | null;
  stripeIdentityStatus: string | null;
  stripeIdentityLastErrorCode: string | null;
  stripeIdentityLastErrorReason: string | null;
  stripeIdentityStartedAt: string | null;
  stripeIdentityUpdatedAt: string | null;
  stripeIdentityVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  personalDetails: Record<string, unknown> | null;
  organizationDetails: Record<string, unknown> | null;
  addressDetails: Record<string, unknown> | null;
  googleProfileDetails: Record<string, unknown> | null;
  contacts: Array<{
    id: string;
    email: string;
    name: string | null;
    updatedAt: string;
  }>;
  paymentMethods: Array<Record<string, unknown>>;
  recentPaymentRequests: Array<{
    id: string;
    amount: string;
    currencyCode: string;
    status: string;
    paymentRail: string | null;
    createdAt: string;
  }>;
  ledgerSummary: Record<
    string,
    {
      completedAmount: string;
      pendingAmount: string;
      completedCount: number;
      pendingCount: number;
    }
  >;
  consumerResources: Array<{
    id: string;
    createdAt: string;
    resource: {
      id: string;
      originalName: string;
      mimetype: string;
      size: number;
      downloadUrl: string;
      createdAt: string;
    };
  }>;
  adminNotes: Array<{
    id: string;
    content: string;
    createdAt: string;
    admin: {
      id: string;
      email: string;
    };
  }>;
  adminFlags: Array<{
    id: string;
    flag: string;
    reason: string | null;
    version: number;
    createdAt: string;
    admin: {
      id: string;
      email: string;
    };
  }>;
  _count: {
    contacts: number;
    paymentMethods: number;
    asPayerPaymentRequests: number;
    asRequesterPaymentRequests: number;
    ledgerEntries: number;
    consumerResources: number;
    adminNotes: number;
    adminFlags: number;
  };
  recentAuthEvents: Array<Record<string, unknown>>;
  recentAdminActions: Array<Record<string, unknown>>;
  recentConsumerActions: Array<Record<string, unknown>>;
};

export type AuditListResponse = {
  items: Array<Record<string, unknown>>;
  total: number;
  page: number;
  pageSize: number;
};

export type ConsumerContractsResponse = {
  items: Array<{
    id: string;
    name: string;
    email: string;
    lastRequestId: string | null;
    lastStatus: string | null;
    lastActivity: string | null;
    docs: number;
    paymentsCount: number;
    completedPaymentsCount: number;
  }>;
  total: number;
  page: number;
  pageSize: number;
};

export type ConsumerLedgerSummaryResponse = {
  consumerId: string;
  summary: Record<
    string,
    {
      completedAmount: string;
      pendingAmount: string;
      completedCount: number;
      pendingCount: number;
    }
  >;
};

export type ConsumerTimelineResponse = {
  items: Array<Record<string, unknown>>;
  total: number;
  page: number;
  pageSize: number;
  dateFrom?: string;
  dateTo?: string;
};

function redirectToLogin() {
  redirect(`/login?sessionExpired=1`);
}

async function fetchAdminApi<T>(path: string): Promise<T | null> {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) return null;

  const cookieStore = await cookies();
  const response = await fetch(`${baseUrl}${path}`, {
    method: `GET`,
    headers: {
      Cookie: cookieStore.toString(),
      origin: getRequestOrigin(),
    },
    cache: `no-store`,
    signal: AbortSignal.timeout(15000),
  });

  if (response.status === 401) {
    redirectToLogin();
    return null;
  }
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as T;
}

export async function getAdminIdentity(): Promise<AdminIdentity | null> {
  return fetchAdminApi<AdminIdentity>(`/admin-v2/me`);
}

export async function getConsumers(params?: {
  page?: number;
  pageSize?: number;
  q?: string;
  accountType?: string;
  contractorKind?: string;
  verificationStatus?: string;
  includeDeleted?: boolean;
}): Promise<ConsumersListResponse | null> {
  const searchParams = new URLSearchParams({
    page: String(params?.page ?? 1),
    pageSize: String(params?.pageSize ?? 20),
  });
  if (params?.q?.trim()) searchParams.set(`q`, params.q.trim());
  if (params?.accountType?.trim()) searchParams.set(`accountType`, params.accountType.trim());
  if (params?.contractorKind?.trim()) searchParams.set(`contractorKind`, params.contractorKind.trim());
  if (params?.verificationStatus?.trim()) searchParams.set(`verificationStatus`, params.verificationStatus.trim());
  if (params?.includeDeleted) searchParams.set(`includeDeleted`, `true`);
  return fetchAdminApi<ConsumersListResponse>(`/admin-v2/consumers?${searchParams.toString()}`);
}

export async function getConsumerCase(consumerId: string): Promise<ConsumerCaseResponse | null> {
  if (!consumerId.trim()) return null;
  return fetchAdminApi<ConsumerCaseResponse>(`/admin-v2/consumers/${consumerId}`);
}

export async function getConsumerContracts(params: {
  consumerId: string;
  page?: number;
  pageSize?: number;
  q?: string;
}): Promise<ConsumerContractsResponse | null> {
  if (!params.consumerId.trim()) return null;
  const searchParams = new URLSearchParams({
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 5),
  });
  if (params.q?.trim()) searchParams.set(`q`, params.q.trim());
  return fetchAdminApi<ConsumerContractsResponse>(
    `/admin-v2/consumers/${params.consumerId}/contracts?${searchParams.toString()}`,
  );
}

export async function getConsumerLedgerSummary(consumerId: string): Promise<ConsumerLedgerSummaryResponse | null> {
  if (!consumerId.trim()) return null;
  return fetchAdminApi<ConsumerLedgerSummaryResponse>(`/admin-v2/consumers/${consumerId}/ledger-summary`);
}

export async function getConsumerAuthHistory(params: {
  consumerId: string;
  page?: number;
  pageSize?: number;
  dateFrom?: string;
  dateTo?: string;
}): Promise<ConsumerTimelineResponse | null> {
  if (!params.consumerId.trim()) return null;
  const searchParams = new URLSearchParams({
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 5),
  });
  if (params.dateFrom?.trim()) searchParams.set(`dateFrom`, params.dateFrom.trim());
  if (params.dateTo?.trim()) searchParams.set(`dateTo`, params.dateTo.trim());
  return fetchAdminApi<ConsumerTimelineResponse>(
    `/admin-v2/consumers/${params.consumerId}/auth-history?${searchParams.toString()}`,
  );
}

export async function getConsumerActionLog(params: {
  consumerId: string;
  page?: number;
  pageSize?: number;
  dateFrom?: string;
  dateTo?: string;
  action?: string;
}): Promise<ConsumerTimelineResponse | null> {
  if (!params.consumerId.trim()) return null;
  const dateTo = params.dateTo?.trim() || new Date().toISOString();
  const dateFrom = params.dateFrom?.trim() || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const searchParams = new URLSearchParams({
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 5),
    dateFrom,
    dateTo,
  });
  if (params.action?.trim()) searchParams.set(`action`, params.action.trim());
  return fetchAdminApi<ConsumerTimelineResponse>(
    `/admin-v2/consumers/${params.consumerId}/action-log?${searchParams.toString()}`,
  );
}

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
  const dateFrom = params?.dateFrom?.trim() || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
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
