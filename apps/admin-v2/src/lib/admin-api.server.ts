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
  contacts: Array<{
    id: string;
    email: string;
    name: string | null;
    updatedAt: string;
  }>;
  paymentMethods: Array<{
    id: string;
    type: string;
    brand: string | null;
    last4: string | null;
    status: string;
    defaultSelected: boolean;
    createdAt: string;
    updatedAt: string;
    disabledAt: string | null;
  }>;
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

export type SystemSummaryCard = {
  label: string;
  status: `healthy` | `watch` | `temporarily-unavailable`;
  explanation: string;
  facts: Array<{
    label: string;
    value: string | number | null;
  }>;
  primaryAction: {
    label: string;
    href: string;
  } | null;
  escalationHint: string | null;
};

export type SystemSummaryResponse = {
  computedAt: string;
  cards: {
    stripeWebhookHealth: SystemSummaryCard;
    schedulerHealth: SystemSummaryCard;
    ledgerAnomalies: SystemSummaryCard;
    emailDeliveryIssuePatterns: SystemSummaryCard;
    staleExchangeRateAlerts: SystemSummaryCard;
  };
};

export type LedgerAnomalyClass =
  | `stalePendingEntries`
  | `inconsistentOutcomeChains`
  | `largeValueOutliers`
  | `orphanedEntries`
  | `duplicateIdempotencyRisk`
  | `impossibleTransitions`;

export type LedgerAnomalySummaryResponse = {
  computedAt: string;
  classes: Record<
    LedgerAnomalyClass,
    {
      label: string;
      count: number | null;
      phaseStatus: `live-actionable`;
      availability: `available` | `temporarily-unavailable`;
      href: string;
    }
  >;
  totalCount: number | null;
};

export type LedgerAnomalyListResponse = {
  class: LedgerAnomalyClass;
  items: Array<{
    id: string;
    ledgerEntryId: string;
    consumerId: string;
    type: string;
    amount: string;
    currencyCode: string;
    entryStatus: string;
    outcomeStatus: string | null;
    outcomeAt: string | null;
    createdAt: string;
    updatedAt: string;
    signal: {
      class: LedgerAnomalyClass;
      detail: string;
    };
  }>;
  nextCursor: string | null;
  computedAt: string;
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
  assignment: {
    current: AssignmentSummary | null;
    history: AssignmentHistoryItem[];
  };
  version: number;
  updatedAt: string;
  staleWarning: boolean;
  dataFreshnessClass: string;
};

export type PaymentOperationsQueueResponse = {
  generatedAt: string;
  posture: {
    kind: string;
    wording: string;
  };
  buckets: Array<{
    key: string;
    label: string;
    operatorPrompt: string;
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
      invoiceTaggedAttachmentsCount: number;
      followUpReason: string;
      dataFreshnessClass: string;
    }>;
  }>;
};

export type PaymentMethodsListResponse = {
  items: Array<{
    id: string;
    type: string;
    brand: string | null;
    last4: string | null;
    bankLast4: string | null;
    status: string;
    defaultSelected: boolean;
    stripeFingerprint: string | null;
    disabledAt: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    consumer: {
      id: string;
      email: string | null;
    };
  }>;
  total: number;
  page: number;
  pageSize: number;
};

export type DocumentsListResponse = {
  items: Array<{
    id: string;
    originalName: string;
    access: string;
    mimeType: string | null;
    size: number | null;
    consumerId: string | null;
    consumerEmail: string | null;
    createdAt: string;
    version: number;
    tags: string[];
    linkedPaymentRequestIds: string[];
  }>;
  total: number;
  page: number;
  pageSize: number;
};

export type DocumentCaseResponse = {
  id: string;
  core: {
    id: string;
    originalName: string;
    access: string;
    mimeType: string;
    size: number;
    createdAt: string;
    deletedAt: string | null;
  };
  consumer: {
    id: string;
    email: string | null;
  } | null;
  tags: Array<{
    id: string;
    name: string;
  }>;
  linkedPaymentRequests: Array<{
    id: string;
    amount: string;
    status: string;
    createdAt: string;
  }>;
  downloadUrl: string;
  version: number;
  updatedAt: string;
  staleWarning: boolean;
  dataFreshnessClass: string;
  assignment: {
    current: AssignmentSummary | null;
    history: AssignmentHistoryItem[];
  };
};

export type DocumentTagsResponse = {
  items: Array<{
    id: string;
    name: string;
    reserved: boolean;
    usageCount: number;
    createdAt: string;
    updatedAt: string;
    version: number;
  }>;
};

export type ExchangeRatesListResponse = {
  items: Array<{
    id: string;
    sourceCurrency: string;
    targetCurrency: string;
    rate: string;
    inverseRate: string | null;
    spreadBps: number | null;
    confidence: number | null;
    status: string;
    provider: string | null;
    effectiveAt: string;
    fetchedAt: string | null;
    expiresAt: string | null;
    approvedAt: string | null;
    createdAt: string;
    updatedAt: string;
    stalenessIndicator: {
      isStale: boolean;
      referenceAt: string;
      ageMinutes: number;
    };
    version: number;
  }>;
  total: number;
  page: number;
  pageSize: number;
};

export type ExchangeRateCaseResponse = {
  id: string;
  core: {
    id: string;
    sourceCurrency: string;
    targetCurrency: string;
    rate: string;
    inverseRate: string | null;
    spreadBps: number | null;
    confidence: number | null;
    status: string;
    provider: string | null;
    providerRateId: string | null;
    fetchedAt: string | null;
    effectiveAt: string;
    expiresAt: string | null;
    approvedAt: string | null;
    approvedBy: string | null;
    createdAt: string;
    deletedAt: string | null;
  };
  approvalHistory: Array<{
    id: string;
    action: string;
    createdAt: string;
    admin: {
      id: string;
      email: string | null;
    };
    metadata: Record<string, unknown>;
  }>;
  stalenessIndicator: {
    isStale: boolean;
    ageMinutes: number;
    referenceAt: string;
    thresholdMinutes: number;
  };
  actionControls: {
    canApprove: boolean;
    allowedActions: string[];
  };
  version: number;
  updatedAt: string;
  staleWarning: boolean;
  dataFreshnessClass: string;
};

export type ExchangeRulesListResponse = {
  items: Array<{
    id: string;
    consumer: {
      id: string;
      email: string | null;
    };
    sourceCurrency: string;
    targetCurrency: string;
    threshold: string;
    maxConvertAmount: string | null;
    minIntervalMinutes: number;
    enabled: boolean;
    nextRunAt: string | null;
    lastRunAt: string | null;
    lastExecution: Record<string, unknown> | null;
    version: number;
    updatedAt: string;
  }>;
  total: number;
  page: number;
  pageSize: number;
};

export type ExchangeRuleCaseResponse = {
  id: string;
  consumer: {
    id: string;
    email: string | null;
  };
  core: {
    id: string;
    sourceCurrency: string;
    targetCurrency: string;
    threshold: string;
    maxConvertAmount: string | null;
    minIntervalMinutes: number;
    enabled: boolean;
    nextRunAt: string | null;
    lastRunAt: string | null;
    createdAt: string;
  };
  lastExecution: Record<string, unknown> | null;
  actionControls: {
    canPause: boolean;
    canResume: boolean;
    canRunNow: boolean;
    allowedActions: string[];
  };
  version: number;
  updatedAt: string;
  staleWarning: boolean;
  dataFreshnessClass: string;
};

export type ExchangeScheduledListResponse = {
  items: Array<{
    id: string;
    consumer: {
      id: string;
      email: string | null;
    };
    amount: string;
    sourceCurrency: string;
    targetCurrency: string;
    status: string;
    attempts: number;
    retryCount: number;
    executeAt: string;
    processingAt: string | null;
    executedAt: string | null;
    failedAt: string | null;
    failureDetail: string | null;
    linkedRuleId: string | null;
    ledgerId: string | null;
    linkedLedgerEntry: {
      id: string;
      type: string;
      amount: string;
      currencyCode: string;
    } | null;
    version: number;
    updatedAt: string;
    assignedTo: AdminRef | null;
  }>;
  total: number;
  page: number;
  pageSize: number;
};

export type ExchangeScheduledCaseResponse = {
  id: string;
  consumer: {
    id: string;
    email: string | null;
  };
  core: {
    id: string;
    sourceCurrency: string;
    targetCurrency: string;
    amount: string;
    status: string;
    attempts: number;
    executeAt: string;
    processingAt: string | null;
    executedAt: string | null;
    failedAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
  failureDetail: string | null;
  linkedRuleId: string | null;
  linkedLedgerEntries: Array<{
    id: string;
    ledgerId: string;
    type: string;
    amount: string;
    currencyCode: string;
    effectiveStatus: string;
    createdAt: string;
  }>;
  actionControls: {
    canForceExecute: boolean;
    canCancel: boolean;
    allowedActions: string[];
  };
  version: number;
  updatedAt: string;
  staleWarning: boolean;
  dataFreshnessClass: string;
  assignment: {
    current: AssignmentSummary | null;
    history: AssignmentHistoryItem[];
  };
};

type PayoutHighValuePolicy = {
  availability: string;
  source: string;
  wording: string;
  configuredThresholds: Array<{
    currencyCode: string;
    amount: string;
  }>;
};

type PayoutHighValueAssessment = {
  eligibility: string;
  thresholdAmount: string | null;
  thresholdCurrency: string;
};

export type PayoutsListResponse = {
  generatedAt: string;
  posture: {
    kind: string;
    wording: string;
  };
  stuckPolicy: {
    thresholdHours: number;
    breachCondition: string;
    escalationTarget: string;
    expectedOperatorReaction: string;
    automationStatus: string;
  };
  highValuePolicy: PayoutHighValuePolicy;
  items: Array<{
    id: string;
    ledgerId: string;
    type: string;
    amount: string;
    currencyCode: string;
    persistedStatus: string;
    effectiveStatus: string;
    derivedStatus: string;
    externalReference: string | null;
    consumer: {
      id: string;
      email: string | null;
    };
    paymentRequestId: string | null;
    createdAt: string;
    updatedAt: string;
    staleWarning: boolean;
    dataFreshnessClass: string;
    outcomeAgeHours: number;
    slaBreachDetected: boolean;
    highValue: PayoutHighValueAssessment;
    hasActiveEscalation: boolean;
    destinationAvailability: string;
    destinationLinkageSource: string | null;
    destinationPaymentMethodSummary: {
      id: string;
      type: string;
      brand: string | null;
      last4: string | null;
      bankLast4: string | null;
      deletedAt: string | null;
    } | null;
  }>;
  pageInfo: CursorPageInfo;
};

export type PayoutCaseResponse = {
  id: string;
  core: {
    id: string;
    ledgerId: string;
    type: string;
    amount: string;
    currencyCode: string;
    persistedStatus: string;
    effectiveStatus: string;
    derivedStatus: string;
    externalReference: string | null;
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
    payerId: string | null;
    payerEmail: string | null;
    requesterId: string | null;
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
  assignment: {
    current: AssignmentSummary | null;
    history: AssignmentHistoryItem[];
  };
  outcomeAgeHours: number;
  slaBreachDetected: boolean;
  version: number;
  stuckPolicy: {
    thresholdHours: number;
    breachCondition: string;
    escalationTarget: string;
    expectedOperatorReaction: string;
    automationStatus: string;
  };
  highValuePolicy: PayoutHighValuePolicy;
  highValue: PayoutHighValueAssessment;
  payoutEscalation: {
    id: string;
    reason: string | null;
    confirmed: boolean;
    createdAt: string;
    escalatedBy: {
      id: string;
      email: string | null;
    };
  } | null;
  actionControls: {
    canEscalate: boolean;
    allowedActions: string[];
    escalateBlockedReason: string | null;
  };
  staleWarning: boolean;
  dataFreshnessClass: string;
  destinationAvailability: string;
  destinationLinkageSource: string | null;
  destinationPaymentMethodSummary: {
    id: string;
    type: string;
    brand: string | null;
    last4: string | null;
    bankLast4: string | null;
    deletedAt: string | null;
  } | null;
};

export type PaymentMethodCaseResponse = {
  id: string;
  type: string;
  status: string;
  stripePaymentMethodId: string | null;
  stripeFingerprint: string | null;
  defaultSelected: boolean;
  version: number;
  brand: string | null;
  last4: string | null;
  expMonth: string | null;
  expYear: string | null;
  bankName: string | null;
  bankLast4: string | null;
  bankCountry: string | null;
  bankCurrency: string | null;
  serviceFee: number;
  createdAt: string;
  updatedAt: string;
  disabledAt: string | null;
  disabledBy: string | null;
  deletedAt: string | null;
  consumer: {
    id: string;
    email: string | null;
  };
  billingDetails: {
    id: string;
    email: string | null;
    name: string | null;
    phone: string | null;
    deletedAt: string | null;
  } | null;
  duplicateEscalation: {
    id: string;
    fingerprint: string;
    duplicateCount: number;
    duplicatePaymentMethodIds: string[];
    createdAt: string;
    escalatedBy: {
      id: string;
      email: string | null;
    };
  } | null;
  fingerprintDuplicates: Array<{
    id: string;
    type: string;
    brand: string | null;
    last4: string | null;
    bankLast4: string | null;
    defaultSelected: boolean;
    createdAt: string;
    deletedAt: string | null;
    consumer: {
      id: string;
      email: string | null;
    };
  }>;
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
  assignment: {
    current: AssignmentSummary | null;
    history: AssignmentHistoryItem[];
  };
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
    assignedTo: AdminRef | null;
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

export type AdminRef = { id: string; name: string | null; email: string | null };

export type AssignmentSummary = {
  id: string;
  assignedTo: AdminRef;
  assignedBy: AdminRef | null;
  assignedAt: string;
  reason: string | null;
  expiresAt: string | null;
};

export type AssignmentHistoryItem = AssignmentSummary & {
  releasedAt: string | null;
  releasedBy: AdminRef | null;
};

export type VerificationCaseResponse = ConsumerCaseResponse & {
  version: number;
  decisionControls: {
    canForceLogout: boolean;
    canDecide: boolean;
    allowedActions: string[];
    canManageAssignments: boolean;
    canReassignAssignments: boolean;
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
  assignment: {
    current: AssignmentSummary | null;
    history: AssignmentHistoryItem[];
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
  const cookieHeader = cookieStore.toString();
  const origin = getRequestOrigin();

  const response = await fetch(`${baseUrl}${path}`, {
    method: `GET`,
    headers: {
      Cookie: cookieHeader,
      origin,
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

export async function getSystemSummary(): Promise<SystemSummaryResponse | null> {
  return fetchAdminApi<SystemSummaryResponse>(`/admin-v2/system/summary`);
}

export async function getLedgerAnomaliesSummary(): Promise<LedgerAnomalySummaryResponse | null> {
  return fetchAdminApi<LedgerAnomalySummaryResponse>(`/admin-v2/ledger/anomalies/summary`);
}

export type SavedViewWorkspace = `ledger_anomalies` | `verification_queue`;

export type SavedViewSummary = {
  id: string;
  workspace: string;
  name: string;
  description: string | null;
  queryPayload: unknown;
  createdAt: string;
  updatedAt: string;
};

export type SavedViewsListResponse = {
  views: SavedViewSummary[];
};

export async function getSavedViews(input: { workspace: SavedViewWorkspace }): Promise<SavedViewsListResponse | null> {
  const searchParams = new URLSearchParams({ workspace: input.workspace });
  return fetchAdminApi<SavedViewsListResponse>(`/admin-v2/saved-views?${searchParams.toString()}`);
}

export type OperationalAlertWorkspace = `ledger_anomalies` | `verification_queue` | `auth_refresh_reuse`;

export type CountGtThreshold = { type: `count_gt`; value: number };
export type OperationalAlertThreshold = CountGtThreshold;

export type OperationalAlertSummary = {
  id: string;
  workspace: OperationalAlertWorkspace;
  name: string;
  description: string | null;
  queryPayload: unknown;
  thresholdPayload: OperationalAlertThreshold;
  evaluationIntervalMinutes: number;
  lastEvaluatedAt: string | null;
  lastEvaluationError: string | null;
  lastFiredAt: string | null;
  lastFireReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OperationalAlertsListResponse = {
  alerts: OperationalAlertSummary[];
};

export async function getOperationalAlerts(input: {
  workspace: OperationalAlertWorkspace;
}): Promise<OperationalAlertsListResponse | null> {
  const searchParams = new URLSearchParams({ workspace: input.workspace });
  return fetchAdminApi<OperationalAlertsListResponse>(`/admin-v2/operational-alerts?${searchParams.toString()}`);
}

export async function getLedgerAnomalies(params: {
  className: string;
  dateFrom: string;
  dateTo?: string;
  cursor?: string;
  limit?: number;
}): Promise<LedgerAnomalyListResponse | null> {
  const searchParams = new URLSearchParams({
    class: params.className,
    dateFrom: params.dateFrom,
    limit: String(params.limit ?? 50),
  });
  if (params.dateTo?.trim()) searchParams.set(`dateTo`, params.dateTo.trim());
  if (params.cursor?.trim()) searchParams.set(`cursor`, params.cursor.trim());
  return fetchAdminApi<LedgerAnomalyListResponse>(`/admin-v2/ledger/anomalies?${searchParams.toString()}`);
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
  const searchParams = new URLSearchParams({
    page: String(params?.page ?? 1),
    pageSize: String(params?.pageSize ?? 20),
  });
  if (params?.q?.trim()) searchParams.set(`q`, params.q.trim());
  if (params?.consumerId?.trim()) searchParams.set(`consumerId`, params.consumerId.trim());
  if (params?.access?.trim()) searchParams.set(`access`, params.access.trim());
  if (params?.mimetype?.trim()) searchParams.set(`mimetype`, params.mimetype.trim());
  if (Number.isFinite(params?.sizeMin)) searchParams.set(`sizeMin`, String(params?.sizeMin));
  if (Number.isFinite(params?.sizeMax)) searchParams.set(`sizeMax`, String(params?.sizeMax));
  if (params?.createdFrom?.trim()) searchParams.set(`createdFrom`, params.createdFrom.trim());
  if (params?.createdTo?.trim()) searchParams.set(`createdTo`, params.createdTo.trim());
  if (params?.paymentRequestId?.trim()) searchParams.set(`paymentRequestId`, params.paymentRequestId.trim());
  if (params?.tag?.trim()) searchParams.set(`tag`, params.tag.trim());
  if (params?.tagId?.trim()) searchParams.set(`tagId`, params.tagId.trim());
  if (params?.includeDeleted) searchParams.set(`includeDeleted`, `true`);
  return fetchAdminApi<DocumentsListResponse>(`/admin-v2/documents?${searchParams.toString()}`);
}

export async function getDocumentCase(documentId: string): Promise<DocumentCaseResponse | null> {
  if (!documentId.trim()) return null;
  return fetchAdminApi<DocumentCaseResponse>(`/admin-v2/documents/${documentId}`);
}

export async function getDocumentTags(): Promise<DocumentTagsResponse | null> {
  return fetchAdminApi<DocumentTagsResponse>(`/admin-v2/documents/tags`);
}

export async function getPaymentOperationsQueue(): Promise<PaymentOperationsQueueResponse | null> {
  return fetchAdminApi<PaymentOperationsQueueResponse>(`/admin-v2/payments/operations-queue`);
}

export async function getPaymentMethods(params?: {
  page?: number;
  pageSize?: number;
  consumerId?: string;
  type?: string;
  defaultSelected?: boolean;
  fingerprint?: string;
  includeDeleted?: boolean;
}): Promise<PaymentMethodsListResponse | null> {
  const searchParams = new URLSearchParams({
    page: String(params?.page ?? 1),
    pageSize: String(params?.pageSize ?? 20),
  });
  if (params?.consumerId?.trim()) searchParams.set(`consumerId`, params.consumerId.trim());
  if (params?.type?.trim()) searchParams.set(`type`, params.type.trim());
  if (typeof params?.defaultSelected === `boolean`) {
    searchParams.set(`defaultSelected`, String(params.defaultSelected));
  }
  if (params?.fingerprint?.trim()) searchParams.set(`fingerprint`, params.fingerprint.trim());
  if (params?.includeDeleted) searchParams.set(`includeDeleted`, `true`);
  return fetchAdminApi<PaymentMethodsListResponse>(`/admin-v2/payment-methods?${searchParams.toString()}`);
}

export async function getExchangeRates(params?: {
  page?: number;
  pageSize?: number;
  fromCurrency?: string;
  toCurrency?: string;
  provider?: string;
  status?: string;
  stale?: boolean;
}): Promise<ExchangeRatesListResponse | null> {
  const searchParams = new URLSearchParams({
    page: String(params?.page ?? 1),
    pageSize: String(params?.pageSize ?? 20),
  });
  if (params?.fromCurrency?.trim()) searchParams.set(`fromCurrency`, params.fromCurrency.trim());
  if (params?.toCurrency?.trim()) searchParams.set(`toCurrency`, params.toCurrency.trim());
  if (params?.provider?.trim()) searchParams.set(`provider`, params.provider.trim());
  if (params?.status?.trim()) searchParams.set(`status`, params.status.trim());
  if (params?.stale) searchParams.set(`stale`, `true`);
  return fetchAdminApi<ExchangeRatesListResponse>(`/admin-v2/exchange/rates?${searchParams.toString()}`);
}

export async function getExchangeRateCase(rateId: string): Promise<ExchangeRateCaseResponse | null> {
  if (!rateId.trim()) return null;
  return fetchAdminApi<ExchangeRateCaseResponse>(`/admin-v2/exchange/rates/${rateId}`);
}

export async function getExchangeRules(params?: {
  page?: number;
  pageSize?: number;
  q?: string;
  enabled?: boolean;
  fromCurrency?: string;
  toCurrency?: string;
}): Promise<ExchangeRulesListResponse | null> {
  const searchParams = new URLSearchParams({
    page: String(params?.page ?? 1),
    pageSize: String(params?.pageSize ?? 20),
  });
  if (params?.q?.trim()) searchParams.set(`q`, params.q.trim());
  if (typeof params?.enabled === `boolean`) searchParams.set(`enabled`, String(params.enabled));
  if (params?.fromCurrency?.trim()) searchParams.set(`fromCurrency`, params.fromCurrency.trim());
  if (params?.toCurrency?.trim()) searchParams.set(`toCurrency`, params.toCurrency.trim());
  return fetchAdminApi<ExchangeRulesListResponse>(`/admin-v2/exchange/rules?${searchParams.toString()}`);
}

export async function getExchangeRuleCase(ruleId: string): Promise<ExchangeRuleCaseResponse | null> {
  if (!ruleId.trim()) return null;
  return fetchAdminApi<ExchangeRuleCaseResponse>(`/admin-v2/exchange/rules/${ruleId}`);
}

export async function getExchangeScheduledConversions(params?: {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: string;
}): Promise<ExchangeScheduledListResponse | null> {
  const searchParams = new URLSearchParams({
    page: String(params?.page ?? 1),
    pageSize: String(params?.pageSize ?? 20),
  });
  if (params?.q?.trim()) searchParams.set(`q`, params.q.trim());
  if (params?.status?.trim()) searchParams.set(`status`, params.status.trim());
  return fetchAdminApi<ExchangeScheduledListResponse>(`/admin-v2/exchange/scheduled?${searchParams.toString()}`);
}

export async function getExchangeScheduledCase(conversionId: string): Promise<ExchangeScheduledCaseResponse | null> {
  if (!conversionId.trim()) return null;
  return fetchAdminApi<ExchangeScheduledCaseResponse>(`/admin-v2/exchange/scheduled/${conversionId}`);
}

export async function getPayouts(params?: { cursor?: string; limit?: number }): Promise<PayoutsListResponse | null> {
  const searchParams = new URLSearchParams({
    limit: String(params?.limit ?? 25),
  });
  if (params?.cursor?.trim()) searchParams.set(`cursor`, params.cursor.trim());
  return fetchAdminApi<PayoutsListResponse>(`/admin-v2/payouts?${searchParams.toString()}`);
}

export async function getPayoutCase(payoutId: string): Promise<PayoutCaseResponse | null> {
  if (!payoutId.trim()) return null;
  return fetchAdminApi<PayoutCaseResponse>(`/admin-v2/payouts/${payoutId}`);
}

export async function getPaymentMethodCase(paymentMethodId: string): Promise<PaymentMethodCaseResponse | null> {
  if (!paymentMethodId.trim()) return null;
  return fetchAdminApi<PaymentMethodCaseResponse>(`/admin-v2/payment-methods/${paymentMethodId}`);
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

export type AdminsListResponse = {
  items: Array<{
    id: string;
    email: string;
    type: string;
    role: string | null;
    status: `ACTIVE` | `INACTIVE`;
    lastActivityAt: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
  }>;
  pendingInvitations: Array<{
    id: string;
    email: string;
    role: string;
    status: `pending` | `expired` | `accepted`;
    expiresAt: string | null;
    createdAt: string;
    invitedBy: { id: string; email: string } | null;
  }>;
  total: number;
  page: number;
  pageSize: number;
};

export type AdminCaseRecordResponse = {
  id: string;
  core: {
    id: string;
    email: string;
    type: string;
    role: string | null;
    status: `ACTIVE` | `INACTIVE`;
    createdAt: string;
    deletedAt: string | null;
  };
  accessProfile: {
    source: string;
    resolvedRole: string | null;
    capabilities: string[];
    workspaces: string[];
    schemaRoleKey: string | null;
    availablePermissionCapabilities: string[];
    permissionOverrides: Array<{
      capability: string;
      granted: boolean;
    }>;
  };
  settings: {
    id: string;
    theme: string;
    createdAt: string;
    updatedAt: string;
  } | null;
  authoredNotesCount: number;
  authoredFlagsCount: number;
  recentAuditActions: Array<{
    id: string;
    action: string;
    resource: string;
    resourceId: string | null;
    metadata: Record<string, unknown> | null;
    actorEmail: string;
    createdAt: string;
  }>;
  recentAuthEvents: Array<{
    id: string;
    event: string;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
  }>;
  invitations: Array<{
    id: string;
    email: string;
    role: string;
    status: `pending` | `expired` | `accepted`;
    expiresAt: string | null;
    acceptedAt: string | null;
    createdAt: string;
  }>;
  auditShortcuts: {
    adminActionsHref: string;
    authHref: string;
  };
  version: number;
  updatedAt: string;
  staleWarning: boolean;
  dataFreshnessClass: string;
};

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

export async function getAdminCaseRecord(adminId: string): Promise<AdminCaseRecordResponse | null> {
  if (!adminId.trim()) return null;
  return fetchAdminApi<AdminCaseRecordResponse>(`/admin-v2/admins/${adminId}`);
}

export type AdminSessionInvalidatedReason =
  | `rotated`
  | `manual_revoke`
  | `cross_admin_revoked`
  | `logout`
  | `refresh_reuse_detected`
  | `password_reset`
  | `admin_deactivated`;

export type AdminSessionView = {
  id: string;
  sessionFamilyId: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  revokedAt: string | null;
  invalidatedReason: AdminSessionInvalidatedReason | null;
  replacedById: string | null;
  current?: boolean;
};

export type ListAdminSessionsResponse = { sessions: AdminSessionView[] };

export async function getMyAdminSessions(): Promise<ListAdminSessionsResponse | null> {
  return fetchAdminApi<ListAdminSessionsResponse>(`/admin-v2/auth/me/sessions`);
}

export async function getAdminSessions(adminId: string): Promise<ListAdminSessionsResponse | null> {
  if (!adminId.trim()) return null;
  return fetchAdminApi<ListAdminSessionsResponse>(`/admin-v2/admins/${adminId}/sessions`);
}
