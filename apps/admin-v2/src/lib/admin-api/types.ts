import {
  type AdminV2AdminIdentity as AdminIdentity,
  type AdminV2LedgerDisputesQuery,
  type AdminV2LedgerEntriesListQuery,
  type AdminV2LedgerAnomalyClass as LedgerAnomalyClass,
  type AdminV2LedgerAnomalyListResponse as LedgerAnomalyListResponse,
  type AdminV2LedgerAnomalySummaryResponse as LedgerAnomalySummaryResponse,
  type AdminV2OperationalAlertSummary as OperationalAlertSummary,
  type AdminV2OperationalAlertThreshold as OperationalAlertThreshold,
  type AdminV2OperationalAlertWorkspace as OperationalAlertWorkspace,
  type AdminV2OperationalAlertsListResponse as OperationalAlertsListResponse,
  type AdminV2OverviewSignalSummary as OverviewSignalSummary,
  type AdminV2OverviewSummaryResponse as OverviewSummaryResponse,
  type AdminV2QuickstartCard as QuickstartCard,
  type AdminV2QuickstartId as QuickstartId,
  type AdminV2QuickstartOperatorModel as QuickstartOperatorModel,
  type AdminV2QuickstartResolvedPreset as QuickstartResolvedPreset,
  type AdminV2QuickstartSurface as QuickstartSurface,
  type AdminV2QuickstartTargetRoute as QuickstartTargetRoute,
  type AdminV2QuickstartsListResponse as QuickstartsListResponse,
  type AdminV2PaymentMethodsListQuery,
  type AdminV2PaymentsListQuery,
  type AdminV2PayoutsListQuery,
  type AdminV2SavedViewSummary as SavedViewSummary,
  type AdminV2SavedViewWorkspace as SavedViewWorkspace,
  type AdminV2SavedViewsListResponse as SavedViewsListResponse,
  type AdminV2SystemSummaryCard as SystemSummaryCard,
  type AdminV2SystemSummaryResponse as SystemSummaryResponse,
  type AdminV2VerificationQueueQuery,
  type AdminV2AdminRef as AdminRef,
} from '@remoola/api-types';

export type {
  AdminIdentity,
  AdminV2LedgerDisputesQuery,
  AdminV2LedgerEntriesListQuery,
  LedgerAnomalyClass,
  LedgerAnomalyListResponse,
  LedgerAnomalySummaryResponse,
  OperationalAlertSummary,
  OperationalAlertThreshold,
  OperationalAlertWorkspace,
  OperationalAlertsListResponse,
  OverviewSignalSummary,
  OverviewSummaryResponse,
  QuickstartCard,
  QuickstartId,
  QuickstartOperatorModel,
  QuickstartResolvedPreset,
  QuickstartSurface,
  QuickstartTargetRoute,
  QuickstartsListResponse,
  AdminV2PaymentMethodsListQuery,
  AdminV2PaymentsListQuery,
  AdminV2PayoutsListQuery,
  SavedViewSummary,
  SavedViewWorkspace,
  SavedViewsListResponse,
  SystemSummaryCard,
  SystemSummaryResponse,
  AdminV2VerificationQueueQuery,
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

type CursorPageInfo = {
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
    assignedTo: AdminRef | null;
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
      assignedTo: AdminRef | null;
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
    mimeType: string;
    size: number;
    consumerId: string | null;
    consumerEmail: string | null;
    createdAt: string;
    version: number;
    tags: string[];
    linkedPaymentRequestIds: string[];
    assignedTo: AdminRef | null;
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
    assignedTo: AdminRef | null;
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
    assignedTo: AdminRef | null;
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

type AdminSessionInvalidatedReason =
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
