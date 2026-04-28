import {
  type AdminV2AssignmentContext,
  type AdminV2AssignmentContextHistoryItem,
  type AdminV2AssignmentContextSummary,
  type AdminV2AdminRef,
} from './assignments';

export type AdminV2AuditListResponse = {
  items: Array<Record<string, unknown>>;
  total: number;
  page: number;
  pageSize: number;
};

export type AdminV2CursorPageInfo = {
  nextCursor: string | null;
};

export type AdminV2ConsumerListItem = {
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
};

export type AdminV2ConsumersListResponse = {
  items: AdminV2ConsumerListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type AdminV2ConsumerCaseResponse = {
  id: string;
  email: string;
  accountType: string;
  contractorKind: string | null;
  verified: boolean | null;
  legalVerified: boolean | null;
  verificationStatus: string;
  verificationReason: string | null;
  verificationUpdatedAt: string | null;
  suspendedAt: string | null;
  suspendedBy: string | null;
  suspensionReason: string | null;
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
  contacts: Array<Record<string, unknown>>;
  paymentMethods: Array<Record<string, unknown>>;
  recentPaymentRequests: Array<Record<string, unknown>>;
  ledgerSummary: Record<string, Record<string, string | number>>;
  consumerResources: Array<Record<string, unknown>>;
  adminNotes: Array<Record<string, unknown>>;
  adminFlags: Array<Record<string, unknown>>;
  _count: Record<string, number>;
  recentAuthEvents: Array<Record<string, unknown>>;
  recentAdminActions: Array<Record<string, unknown>>;
  recentConsumerActions: Array<Record<string, unknown>>;
};

export type AdminV2PaymentOperationsQueueResponse = {
  computedAt: string;
  buckets: Record<string, { label: string; items: Array<Record<string, unknown>> }>;
};

export type AdminV2PaymentsListResponse = {
  items: Array<Record<string, unknown>>;
  pageInfo: AdminV2CursorPageInfo;
};

export type AdminV2PaymentCaseResponse = Record<string, unknown> & {
  id: string;
  version: number;
};

export type AdminV2PaymentMethodsListResponse = {
  items: Array<Record<string, unknown>>;
  total: number;
  page: number;
  pageSize: number;
};

export type AdminV2PaymentMethodCaseResponse = Record<string, unknown> & {
  id: string;
  version: number;
};

export type AdminV2PayoutsListResponse = {
  items: Array<Record<string, unknown>>;
  pageInfo: AdminV2CursorPageInfo;
};

export type AdminV2PayoutCaseResponse = Record<string, unknown> & {
  id: string;
  version: number;
};

export type AdminV2DocumentsListResponse = {
  items: Array<Record<string, unknown>>;
  total: number;
  page: number;
  pageSize: number;
};

export type AdminV2DocumentCaseResponse = Record<string, unknown> & {
  id: string;
  version: number;
};

export type AdminV2DocumentTagsResponse = {
  tags: Array<Record<string, unknown>>;
};

export type AdminV2ExchangeRatesListResponse = {
  items: Array<Record<string, unknown>>;
  total: number;
  page: number;
  pageSize: number;
};

export type AdminV2ExchangeRateCaseResponse = Record<string, unknown> & {
  id: string;
  version: number;
};

export type AdminV2ExchangeRulesListResponse = {
  items: Array<Record<string, unknown>>;
  total: number;
  page: number;
  pageSize: number;
};

export type AdminV2ExchangeRuleCaseResponse = Record<string, unknown> & {
  id: string;
  version: number;
};

export type AdminV2ExchangeScheduledListResponse = {
  items: Array<Record<string, unknown>>;
  total: number;
  page: number;
  pageSize: number;
};

export type AdminV2ExchangeScheduledCaseResponse = Record<string, unknown> & {
  id: string;
  version: number;
};

export type AdminV2LedgerEntriesListResponse = {
  items: Array<Record<string, unknown>>;
  pageInfo: AdminV2CursorPageInfo;
};

export type AdminV2LedgerEntryCaseResponse = Record<string, unknown> & {
  id: string;
};

export type AdminV2LedgerDisputesResponse = {
  items: Array<Record<string, unknown>>;
  pageInfo: AdminV2CursorPageInfo;
};

export type AdminV2VerificationQueueResponse = {
  items: Array<Record<string, unknown>>;
  total: number;
  page: number;
  pageSize: number;
};

export type AdminV2AssignmentSummary = AdminV2AssignmentContextSummary;
export type AdminV2AssignmentHistoryItem = AdminV2AssignmentContextHistoryItem;

export type AdminV2VerificationCaseResponse = AdminV2ConsumerCaseResponse & {
  version: number;
  decisionControls: Record<string, unknown>;
  assignment: AdminV2AssignmentContext;
};

export type AdminV2ConsumerContractsResponse = {
  items: Array<Record<string, unknown>>;
  total: number;
  page: number;
  pageSize: number;
};

export type AdminV2ConsumerLedgerSummaryResponse = {
  currencies: Record<string, Record<string, string | number>>;
};

export type AdminV2ConsumerTimelineResponse = {
  items: Array<Record<string, unknown>>;
  total: number;
  page: number;
  pageSize: number;
};

export type AdminV2AdminsListResponse = {
  items: Array<Record<string, unknown>>;
  total: number;
  page: number;
  pageSize: number;
};

export type AdminV2AdminCaseRecordResponse = Record<string, unknown> & {
  id: string;
  email: string;
  version: number;
};

export type AdminV2AdminSessionInvalidatedReason =
  | `logout`
  | `logout_all`
  | `refresh_reuse`
  | `manager_revoke`
  | `password_reset`
  | `password_changed`
  | `account_deactivated`;

export type AdminV2AdminSessionView = {
  id: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  revokedAt: string | null;
  invalidatedReason: AdminV2AdminSessionInvalidatedReason | string | null;
  current: boolean;
};

export type AdminV2ListAdminSessionsResponse = { sessions: AdminV2AdminSessionView[] };

export type { AdminV2AdminRef };
