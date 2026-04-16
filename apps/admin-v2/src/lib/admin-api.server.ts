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

export type OverviewSummaryResponse = {
  computedAt: string;
  signals: Record<string, Record<string, unknown>>;
};

export type CursorPageInfo = {
  nextCursor: string | null;
  limit: number;
};

export type PaymentsListResponse = {
  items: Array<{
    id: string;
    amount: string;
    currencyCode: string;
    persistedStatus: string;
    effectiveStatus: string;
    staleWarning: boolean;
    paymentRail: string | null;
    payer: {
      id: string | null;
      email: string | null;
    };
    requester: {
      id: string | null;
      email: string | null;
    };
    dueDate: string | null;
    createdAt: string;
    updatedAt: string;
    attachmentsCount: number;
    dataFreshnessClass: string;
  }>;
  pageInfo: CursorPageInfo;
};

export type PaymentCaseResponse = {
  id: string;
  core: {
    id: string;
    amount: string;
    currencyCode: string;
    persistedStatus: string;
    effectiveStatus: string;
    paymentRail: string | null;
    description: string | null;
    dueDate: string | null;
    sentDate: string | null;
    createdAt: string;
    deletedAt: string | null;
  };
  payer: {
    id: string | null;
    email: string | null;
  };
  requester: {
    id: string | null;
    email: string | null;
  };
  attachments: Array<{
    id: string;
    resourceId: string;
    name: string;
    size: number;
    mimetype: string;
    downloadUrl: string;
    createdAt: string;
    deletedAt: string | null;
    resourceDeletedAt: string | null;
  }>;
  ledgerEntries: Array<{
    id: string;
    ledgerId: string;
    type: string;
    amount: string;
    currencyCode: string;
    effectiveStatus: string;
    createdAt: string;
    deletedAt: string | null;
  }>;
  timeline: Array<{
    event: string;
    timestamp: string;
    metadata: Record<string, unknown> | null;
  }>;
  auditContext: Array<{
    id: string;
    action: string;
    resource: string;
    resourceId: string | null;
    adminEmail: string | null;
    createdAt: string;
  }>;
  version: number;
  updatedAt: string;
  staleWarning: boolean;
  dataFreshnessClass: string;
};

export type LedgerEntriesListResponse = {
  items: Array<{
    id: string;
    ledgerId: string;
    type: string;
    amount: string;
    currencyCode: string;
    persistedStatus: string;
    effectiveStatus: string;
    paymentRail: string | null;
    consumerId: string;
    consumerEmail: string | null;
    paymentRequestId: string | null;
    paymentRequestStatus: string | null;
    createdAt: string;
    updatedAt: string;
    disputeCount: number;
    staleWarning: boolean;
    dataFreshnessClass: string;
  }>;
  pageInfo: CursorPageInfo;
};

export type LedgerEntryCaseResponse = {
  id: string;
  core: {
    id: string;
    ledgerId: string;
    type: string;
    amount: string;
    currencyCode: string;
    persistedStatus: string;
    effectiveStatus: string;
    paymentRail: string | null;
    feesType: string | null;
    feesAmount: string | null;
    stripeId: string | null;
    idempotencyKey: string | null;
    createdAt: string;
    updatedAt: string;
  };
  consumer: {
    id: string;
    email: string | null;
  };
  paymentRequest: {
    id: string;
    amount: string;
    currencyCode: string;
    status: string;
    paymentRail: string | null;
    payerId: string;
    payerEmail: string | null;
    requesterId: string;
    requesterEmail: string | null;
  } | null;
  metadata: Record<string, unknown>;
  outcomes: Array<{
    id: string;
    status: string;
    source: string | null;
    externalId: string | null;
    createdAt: string;
  }>;
  disputes: Array<{
    id: string;
    stripeDisputeId: string;
    metadata: Record<string, unknown>;
    createdAt: string;
  }>;
  relatedEntries: Array<{
    id: string;
    type: string;
    amount: string;
    currencyCode: string;
    effectiveStatus: string;
    createdAt: string;
  }>;
  auditContext: Array<{
    id: string;
    action: string;
    resource: string;
    resourceId: string | null;
    adminEmail: string | null;
    createdAt: string;
  }>;
  staleWarning: boolean;
  dataFreshnessClass: string;
};

export type LedgerDisputesResponse = {
  items: Array<{
    id: string;
    stripeDisputeId: string;
    disputeStatus: string | null;
    reason: string | null;
    amountMinor: number | null;
    updatedAt: string | null;
    createdAt: string;
    metadata: Record<string, unknown>;
    ledgerEntry: {
      id: string;
      ledgerId: string;
      paymentRequestId: string | null;
      consumerId: string;
      type: string;
      amount: string;
      currencyCode: string;
      paymentRail: string | null;
    };
    dataFreshnessClass: string;
  }>;
  pageInfo: CursorPageInfo;
};

export type VerificationQueueResponse = {
  items: Array<{
    id: string;
    email: string;
    accountType: string;
    contractorKind: string | null;
    verificationStatus: string;
    stripeIdentityStatus: string | null;
    country: string | null;
    createdAt: string;
    updatedAt: string;
    verificationUpdatedAt: string | null;
    missingProfileData: boolean;
    missingDocuments: boolean;
    documentsCount: number;
    slaBreached: boolean;
  }>;
  total: number;
  page: number;
  pageSize: number;
  activeStatuses: string[];
  sla: {
    breachedCount: number;
    thresholdHours: number;
    lastComputedAt: string | null;
  };
};

export type VerificationCaseResponse = ConsumerCaseResponse & {
  version: number;
  decisionControls: {
    canForceLogout: boolean;
    canDecide: boolean;
    allowedActions: string[];
  };
  decisionHistory: Array<Record<string, unknown>>;
  authRisk: {
    loginFailures24h: number;
    refreshReuse30d: number;
    recentEvents: Array<Record<string, unknown>>;
  };
  verificationSla: {
    breached: boolean;
    thresholdHours: number;
    lastComputedAt: string | null;
  };
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

export async function getOverviewSummary(): Promise<OverviewSummaryResponse | null> {
  return fetchAdminApi<OverviewSummaryResponse>(`/admin-v2/overview/summary`);
}

export async function getPayments(params?: {
  cursor?: string;
  limit?: number;
  q?: string;
  status?: string;
  paymentRail?: string;
  currencyCode?: string;
  amountMin?: number;
  amountMax?: number;
  dueDateFrom?: string;
  dueDateTo?: string;
  createdFrom?: string;
  createdTo?: string;
  overdue?: boolean;
}): Promise<PaymentsListResponse | null> {
  const searchParams = new URLSearchParams({
    limit: String(params?.limit ?? 25),
  });
  if (params?.cursor?.trim()) searchParams.set(`cursor`, params.cursor.trim());
  if (params?.q?.trim()) searchParams.set(`q`, params.q.trim());
  if (params?.status?.trim()) searchParams.set(`status`, params.status.trim());
  if (params?.paymentRail?.trim()) searchParams.set(`paymentRail`, params.paymentRail.trim());
  if (params?.currencyCode?.trim()) searchParams.set(`currencyCode`, params.currencyCode.trim());
  if (Number.isFinite(params?.amountMin)) searchParams.set(`amountMin`, String(params?.amountMin));
  if (Number.isFinite(params?.amountMax)) searchParams.set(`amountMax`, String(params?.amountMax));
  if (params?.dueDateFrom?.trim()) searchParams.set(`dueDateFrom`, params.dueDateFrom.trim());
  if (params?.dueDateTo?.trim()) searchParams.set(`dueDateTo`, params.dueDateTo.trim());
  if (params?.createdFrom?.trim()) searchParams.set(`createdFrom`, params.createdFrom.trim());
  if (params?.createdTo?.trim()) searchParams.set(`createdTo`, params.createdTo.trim());
  if (params?.overdue) searchParams.set(`overdue`, `true`);
  return fetchAdminApi<PaymentsListResponse>(`/admin-v2/payments?${searchParams.toString()}`);
}

export async function getPaymentCase(paymentRequestId: string): Promise<PaymentCaseResponse | null> {
  if (!paymentRequestId.trim()) return null;
  return fetchAdminApi<PaymentCaseResponse>(`/admin-v2/payments/${paymentRequestId}`);
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

export async function getVerificationQueue(params?: {
  page?: number;
  pageSize?: number;
  status?: string;
  stripeIdentityStatus?: string;
  country?: string;
  contractorKind?: string;
  missingProfileData?: boolean;
  missingDocuments?: boolean;
}): Promise<VerificationQueueResponse | null> {
  const searchParams = new URLSearchParams({
    page: String(params?.page ?? 1),
    pageSize: String(params?.pageSize ?? 20),
  });
  if (params?.status?.trim()) searchParams.set(`status`, params.status.trim());
  if (params?.stripeIdentityStatus?.trim())
    searchParams.set(`stripeIdentityStatus`, params.stripeIdentityStatus.trim());
  if (params?.country?.trim()) searchParams.set(`country`, params.country.trim());
  if (params?.contractorKind?.trim()) searchParams.set(`contractorKind`, params.contractorKind.trim());
  if (params?.missingProfileData) searchParams.set(`missingProfileData`, `true`);
  if (params?.missingDocuments) searchParams.set(`missingDocuments`, `true`);
  return fetchAdminApi<VerificationQueueResponse>(`/admin-v2/verification/queue?${searchParams.toString()}`);
}

export async function getVerificationCase(consumerId: string): Promise<VerificationCaseResponse | null> {
  if (!consumerId.trim()) return null;
  return fetchAdminApi<VerificationCaseResponse>(`/admin-v2/verification/${consumerId}`);
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

export async function getLedgerEntries(params?: {
  cursor?: string;
  limit?: number;
  q?: string;
  type?: string;
  status?: string;
  currencyCode?: string;
  paymentRequestId?: string;
  consumerId?: string;
  amountSign?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<LedgerEntriesListResponse | null> {
  const searchParams = new URLSearchParams({
    limit: String(params?.limit ?? 25),
  });
  if (params?.cursor?.trim()) searchParams.set(`cursor`, params.cursor.trim());
  if (params?.q?.trim()) searchParams.set(`q`, params.q.trim());
  if (params?.type?.trim()) searchParams.set(`type`, params.type.trim());
  if (params?.status?.trim()) searchParams.set(`status`, params.status.trim());
  if (params?.currencyCode?.trim()) searchParams.set(`currencyCode`, params.currencyCode.trim());
  if (params?.paymentRequestId?.trim()) searchParams.set(`paymentRequestId`, params.paymentRequestId.trim());
  if (params?.consumerId?.trim()) searchParams.set(`consumerId`, params.consumerId.trim());
  if (params?.amountSign?.trim()) searchParams.set(`amountSign`, params.amountSign.trim());
  if (params?.dateFrom?.trim()) searchParams.set(`dateFrom`, params.dateFrom.trim());
  if (params?.dateTo?.trim()) searchParams.set(`dateTo`, params.dateTo.trim());
  return fetchAdminApi<LedgerEntriesListResponse>(`/admin-v2/ledger?${searchParams.toString()}`);
}

export async function getLedgerEntryCase(ledgerEntryId: string): Promise<LedgerEntryCaseResponse | null> {
  if (!ledgerEntryId.trim()) return null;
  return fetchAdminApi<LedgerEntryCaseResponse>(`/admin-v2/ledger/${ledgerEntryId}`);
}

export async function getLedgerDisputes(params?: {
  cursor?: string;
  limit?: number;
  paymentRequestId?: string;
  consumerId?: string;
  q?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<LedgerDisputesResponse | null> {
  const searchParams = new URLSearchParams({
    limit: String(params?.limit ?? 25),
  });
  if (params?.cursor?.trim()) searchParams.set(`cursor`, params.cursor.trim());
  if (params?.paymentRequestId?.trim()) searchParams.set(`paymentRequestId`, params.paymentRequestId.trim());
  if (params?.consumerId?.trim()) searchParams.set(`consumerId`, params.consumerId.trim());
  if (params?.q?.trim()) searchParams.set(`q`, params.q.trim());
  if (params?.dateFrom?.trim()) searchParams.set(`dateFrom`, params.dateFrom.trim());
  if (params?.dateTo?.trim()) searchParams.set(`dateTo`, params.dateTo.trim());
  return fetchAdminApi<LedgerDisputesResponse>(`/admin-v2/ledger/disputes?${searchParams.toString()}`);
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
