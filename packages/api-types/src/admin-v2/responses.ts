import { z } from 'zod';

import { type AdminV2AssignmentContext, type AdminV2AdminRef } from './assignments';
import { ADMIN_V2_LEDGER_ANOMALY_CLASSES } from './ledger-anomalies';
import {
  ADMIN_V2_OPERATIONAL_ALERT_WORKSPACES,
  adminV2OperationalAlertThresholdSchema,
  type AdminV2OperationalAlertThreshold,
} from './operational-alerts';
import { ADMIN_V2_SAVED_VIEW_WORKSPACES } from './saved-views';
import { jsonObjectSchema, jsonValueSchema } from '../validation';

const isoDateTimeSchema = z.string();
const nullableIsoDateTimeSchema = isoDateTimeSchema.nullable();
const stringOrNullSchema = z.string().nullable();
export const adminV2AdminRefSchema = z.object({
  id: z.string(),
  name: stringOrNullSchema,
  email: stringOrNullSchema,
});

export const adminV2AssignmentSummarySchema = z.object({
  id: z.string(),
  assignedTo: adminV2AdminRefSchema,
  assignedBy: adminV2AdminRefSchema.nullable(),
  assignedAt: isoDateTimeSchema,
  reason: stringOrNullSchema,
  expiresAt: nullableIsoDateTimeSchema,
});

export const adminV2AssignmentHistoryItemSchema = adminV2AssignmentSummarySchema.extend({
  releasedAt: nullableIsoDateTimeSchema,
  releasedBy: adminV2AdminRefSchema.nullable(),
});

export const adminV2AssignmentContextSchema = z.object({
  current: adminV2AssignmentSummarySchema.nullable(),
  history: z.array(adminV2AssignmentHistoryItemSchema),
});

export const adminV2AdminIdentitySchema = z.object({
  id: z.string(),
  email: z.string(),
  type: z.string(),
  role: stringOrNullSchema,
  source: stringOrNullSchema.optional(),
  bootstrapReason: stringOrNullSchema.optional(),
  phase: z.string(),
  accessMode: z.string().optional(),
  featureMaturity: z.string().optional(),
  capabilities: z.array(z.string()),
  workspaces: z.array(z.string()),
});

const adminV2CountSummarySchema = z.object({
  completedAmount: z.string(),
  pendingAmount: z.string(),
  completedCount: z.number(),
  pendingCount: z.number(),
});

const adminV2CursorPageInfoSchema = z
  .object({
    nextCursor: z.string().nullable(),
  })
  .passthrough();

const adminV2ConsumerPartySchema = z.object({
  id: z.string().nullable(),
  email: z.string().nullable(),
});

const adminV2ConsumerRefSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
});

const adminV2AdminEmailRefSchema = z.object({
  id: z.string(),
  email: z.string(),
});

const adminV2NullableAdminEmailRefSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
});

const adminV2AuditContextItemSchema = z.object({
  id: z.string(),
  action: z.string(),
  resource: z.string(),
  resourceId: z.string().nullable(),
  adminEmail: z.string().nullable(),
  createdAt: isoDateTimeSchema,
});

const adminV2TimelineMetadataSchema = jsonObjectSchema.nullable();

const adminV2PaymentTimelineItemSchema = z.object({
  event: z.string(),
  timestamp: isoDateTimeSchema,
  metadata: adminV2TimelineMetadataSchema,
});

const adminV2OutcomeItemSchema = z.object({
  id: z.string(),
  status: z.string(),
  source: z.string().nullable(),
  externalId: z.string().nullable(),
  createdAt: isoDateTimeSchema,
});

const adminV2RelatedLedgerEntrySchema = z.object({
  id: z.string(),
  ledgerId: z.string(),
  type: z.string(),
  amount: z.string(),
  currencyCode: z.string(),
  effectiveStatus: z.string(),
  createdAt: isoDateTimeSchema,
});

const adminV2AuthAuditRowSchema = z
  .object({
    id: z.string(),
    email: z.string().nullable().optional(),
    event: z.string(),
    ipAddress: z.string().nullable().optional(),
    userAgent: z.string().nullable().optional(),
    createdAt: isoDateTimeSchema,
  })
  .passthrough();

const adminV2AdminActionAuditRowSchema = z
  .object({
    id: z.string(),
    action: z.string(),
    resource: z.string(),
    resourceId: z.string().nullable().optional(),
    adminId: z.string().nullable().optional(),
    adminEmail: z.string().nullable().optional(),
    consumerId: z.string().nullable().optional(),
    metadata: adminV2TimelineMetadataSchema.optional(),
    createdAt: isoDateTimeSchema,
  })
  .passthrough();

const adminV2ConsumerActionAuditRowSchema = z
  .object({
    id: z.string(),
    consumerId: z.string().nullable().optional(),
    action: z.string(),
    resource: z.string(),
    resourceId: z.string().nullable().optional(),
    metadata: adminV2TimelineMetadataSchema.optional(),
    createdAt: isoDateTimeSchema,
  })
  .passthrough();

const adminV2DecisionHistoryItemSchema = z
  .object({
    id: z.string(),
    action: z.string(),
    adminId: z.string().nullable().optional(),
    admin: adminV2NullableAdminEmailRefSchema.partial().optional(),
    metadata: adminV2TimelineMetadataSchema.optional(),
    createdAt: isoDateTimeSchema,
  })
  .passthrough();

const adminV2DocumentTagItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  reserved: z.boolean(),
  usageCount: z.number(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  version: z.number(),
});

const adminV2LinkedPaymentRequestSchema = z.object({
  id: z.string(),
  amount: z.string(),
  status: z.string(),
  createdAt: isoDateTimeSchema,
});

const adminV2OperationalAlertSummarySchema = z.object({
  id: z.string(),
  workspace: z.enum(ADMIN_V2_OPERATIONAL_ALERT_WORKSPACES),
  name: z.string(),
  description: z.string().nullable(),
  queryPayload: jsonValueSchema,
  thresholdPayload: adminV2OperationalAlertThresholdSchema,
  evaluationIntervalMinutes: z.number(),
  lastEvaluatedAt: nullableIsoDateTimeSchema,
  lastEvaluationError: z.string().nullable(),
  lastFiredAt: nullableIsoDateTimeSchema,
  lastFireReason: z.string().nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

const adminV2SavedViewSummarySchema = z.object({
  id: z.string(),
  workspace: z.enum(ADMIN_V2_SAVED_VIEW_WORKSPACES),
  name: z.string(),
  description: z.string().nullable(),
  queryPayload: jsonValueSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

const adminV2QuickstartCardSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  eyebrow: z.string(),
  operatorModel: z.enum([`entry-only`, `saved-view-compatible`, `threshold-editor`]),
  targetPath: z.string(),
  surfaces: z.array(z.enum([`shell`, `overview`])),
  requiredCapabilities: z.array(z.string()).optional(),
});

const adminV2QuickstartResolvedPresetSchemaValue = z.union([
  adminV2QuickstartCardSchema.extend({
    targetPath: z.literal(`/verification`),
    filters: z
      .object({
        status: z.string().optional(),
        stripeIdentityStatus: z.string().optional(),
        country: z.string().optional(),
        contractorKind: z.string().optional(),
        missingProfileData: z.literal(true).optional(),
        missingDocuments: z.literal(true).optional(),
      })
      .strict(),
  }),
  adminV2QuickstartCardSchema.extend({
    targetPath: z.literal(`/payments`),
    filters: z
      .object({
        status: z.string().optional(),
        paymentRail: z.string().optional(),
        currencyCode: z.string().optional(),
        overdue: z.literal(true).optional(),
      })
      .strict(),
  }),
  adminV2QuickstartCardSchema.extend({
    targetPath: z.literal(`/audit/admin-actions`),
    filters: z
      .object({
        action: z.string().optional(),
        adminId: z.string().optional(),
        email: z.string().optional(),
        resourceId: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      })
      .strict(),
  }),
  adminV2QuickstartCardSchema.extend({
    targetPath: z.enum([
      `/payments/operations`,
      `/ledger/anomalies`,
      `/documents`,
      `/exchange/scheduled`,
      `/admins`,
      `/system/alerts`,
    ]),
    filters: z.object({}).strict(),
  }),
]);

const adminV2SystemSummaryCardSchema = z.object({
  label: z.string(),
  status: z.enum([`healthy`, `watch`, `temporarily-unavailable`]),
  explanation: z.string(),
  facts: z.array(
    z.object({
      label: z.string(),
      value: z.union([z.string(), z.number(), z.null()]),
    }),
  ),
  primaryAction: z
    .object({
      label: z.string(),
      href: z.string(),
    })
    .nullable(),
  escalationHint: z.string().nullable(),
});

const adminV2OverviewSignalSummarySchema = z.object({
  label: z.string(),
  phaseStatus: z.enum([`live-actionable`, `count-only`, `deferred`]),
  availability: z.enum([`available`, `temporarily-unavailable`]),
  href: z.string().nullable(),
  count: z.number().nullable().optional(),
  slaBreachedCount: z.number().nullable().optional(),
  items: z.array(adminV2AdminActionAuditRowSchema).optional(),
});

export const adminV2OverviewSummaryResponseSchema = z.object({
  computedAt: isoDateTimeSchema,
  signals: z.record(z.string(), adminV2OverviewSignalSummarySchema),
});

export const adminV2SystemSummaryResponseSchema = z.object({
  computedAt: isoDateTimeSchema,
  cards: z.object({
    stripeWebhookHealth: adminV2SystemSummaryCardSchema,
    schedulerHealth: adminV2SystemSummaryCardSchema,
    ledgerAnomalies: adminV2SystemSummaryCardSchema,
    emailDeliveryIssuePatterns: adminV2SystemSummaryCardSchema,
    staleExchangeRateAlerts: adminV2SystemSummaryCardSchema,
  }),
});

export const adminV2QuickstartsListResponseSchema = z.object({
  items: z.array(adminV2QuickstartCardSchema),
});

export const adminV2QuickstartResolvedPresetSchema = adminV2QuickstartResolvedPresetSchemaValue;

export const adminV2SavedViewsListResponseSchema = z.object({
  views: z.array(adminV2SavedViewSummarySchema),
});

export const adminV2OperationalAlertsListResponseSchema = z.object({
  alerts: z.array(adminV2OperationalAlertSummarySchema),
});

export type AdminV2AuthAuditRow = z.infer<typeof adminV2AuthAuditRowSchema>;
export type AdminV2AdminActionAuditRow = z.infer<typeof adminV2AdminActionAuditRowSchema>;
export type AdminV2ConsumerActionAuditRow = z.infer<typeof adminV2ConsumerActionAuditRowSchema>;

export type AdminV2AuditListResponse = {
  items: Array<AdminV2AuthAuditRow | AdminV2AdminActionAuditRow | AdminV2ConsumerActionAuditRow>;
  total: number;
  page: number;
  pageSize: number;
};

export const adminV2AuditListResponseSchema = z.object({
  items: z.array(
    z.union([adminV2AuthAuditRowSchema, adminV2AdminActionAuditRowSchema, adminV2ConsumerActionAuditRowSchema]),
  ),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export type AdminV2ConsumersListResponse = {
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

const adminV2ConsumerListItemSchema = z.object({
  id: z.string(),
  email: z.string(),
  accountType: z.string(),
  contractorKind: z.string().nullable(),
  verificationStatus: z.string(),
  stripeIdentityStatus: z.string().nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  deletedAt: nullableIsoDateTimeSchema,
  displayName: z.string().nullable(),
  adminFlags: z.array(
    z.object({
      id: z.string(),
      flag: z.string(),
    }),
  ),
  _count: z.object({
    adminNotes: z.number(),
    adminFlags: z.number(),
  }),
  summary: z.object({
    notesCount: z.number(),
    activeFlagsCount: z.number(),
    deleted: z.boolean(),
  }),
});

export const adminV2ConsumersListResponseSchema = z.object({
  items: z.array(adminV2ConsumerListItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

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
  personalDetails: z.infer<typeof jsonObjectSchema> | null;
  organizationDetails: z.infer<typeof jsonObjectSchema> | null;
  addressDetails: z.infer<typeof jsonObjectSchema> | null;
  googleProfileDetails: z.infer<typeof jsonObjectSchema> | null;
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
  ledgerSummary: Record<string, z.infer<typeof adminV2CountSummarySchema>>;
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
  recentAuthEvents: AdminV2AuthAuditRow[];
  recentAdminActions: AdminV2AdminActionAuditRow[];
  recentConsumerActions: AdminV2ConsumerActionAuditRow[];
};

const adminV2ConsumerCaseResponseSchemaBase = z.object({
  id: z.string(),
  email: z.string(),
  accountType: z.string(),
  contractorKind: z.string().nullable(),
  verified: z.boolean().nullable(),
  legalVerified: z.boolean().nullable(),
  verificationStatus: z.string(),
  verificationReason: z.string().nullable(),
  verificationUpdatedAt: nullableIsoDateTimeSchema,
  suspendedAt: nullableIsoDateTimeSchema,
  suspendedBy: z.string().nullable(),
  suspensionReason: z.string().nullable(),
  stripeIdentityStatus: z.string().nullable(),
  stripeIdentityLastErrorCode: z.string().nullable(),
  stripeIdentityLastErrorReason: z.string().nullable(),
  stripeIdentityStartedAt: nullableIsoDateTimeSchema,
  stripeIdentityUpdatedAt: nullableIsoDateTimeSchema,
  stripeIdentityVerifiedAt: nullableIsoDateTimeSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  deletedAt: nullableIsoDateTimeSchema,
  personalDetails: jsonObjectSchema.nullable(),
  organizationDetails: jsonObjectSchema.nullable(),
  addressDetails: jsonObjectSchema.nullable(),
  googleProfileDetails: jsonObjectSchema.nullable(),
  contacts: z.array(
    z.object({
      id: z.string(),
      email: z.string(),
      name: z.string().nullable(),
      updatedAt: isoDateTimeSchema,
    }),
  ),
  paymentMethods: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      brand: z.string().nullable(),
      last4: z.string().nullable(),
      status: z.string(),
      defaultSelected: z.boolean(),
      createdAt: isoDateTimeSchema,
      updatedAt: isoDateTimeSchema,
      disabledAt: nullableIsoDateTimeSchema,
    }),
  ),
  recentPaymentRequests: z.array(
    z.object({
      id: z.string(),
      amount: z.string(),
      currencyCode: z.string(),
      status: z.string(),
      paymentRail: z.string().nullable(),
      createdAt: isoDateTimeSchema,
    }),
  ),
  ledgerSummary: z.record(z.string(), adminV2CountSummarySchema),
  consumerResources: z.array(
    z.object({
      id: z.string(),
      createdAt: isoDateTimeSchema,
      resource: z.object({
        id: z.string(),
        originalName: z.string(),
        mimetype: z.string(),
        size: z.number(),
        downloadUrl: z.string(),
        createdAt: isoDateTimeSchema,
      }),
    }),
  ),
  adminNotes: z.array(
    z.object({
      id: z.string(),
      content: z.string(),
      createdAt: isoDateTimeSchema,
      admin: adminV2AdminEmailRefSchema,
    }),
  ),
  adminFlags: z.array(
    z.object({
      id: z.string(),
      flag: z.string(),
      reason: z.string().nullable(),
      version: z.number(),
      createdAt: isoDateTimeSchema,
      admin: adminV2AdminEmailRefSchema,
    }),
  ),
  _count: z.object({
    contacts: z.number(),
    paymentMethods: z.number(),
    asPayerPaymentRequests: z.number(),
    asRequesterPaymentRequests: z.number(),
    ledgerEntries: z.number(),
    consumerResources: z.number(),
    adminNotes: z.number(),
    adminFlags: z.number(),
  }),
  recentAuthEvents: z.array(adminV2AuthAuditRowSchema),
  recentAdminActions: z.array(adminV2AdminActionAuditRowSchema),
  recentConsumerActions: z.array(adminV2ConsumerActionAuditRowSchema),
});

export const adminV2ConsumerCaseResponseSchema = adminV2ConsumerCaseResponseSchemaBase;

export type AdminV2PaymentOperationsQueueResponse = {
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
      payer: { id: string | null; email: string | null };
      requester: { id: string | null; email: string | null };
      dueDate: string | null;
      createdAt: string;
      updatedAt: string;
      attachmentsCount: number;
      invoiceTaggedAttachmentsCount: number;
      followUpReason: string;
      dataFreshnessClass: string;
      assignedTo: AdminV2AdminRef | null;
    }>;
  }>;
};

const adminV2PaymentQueueItemSchema = z.object({
  id: z.string(),
  amount: z.string(),
  currencyCode: z.string(),
  persistedStatus: z.string(),
  effectiveStatus: z.string(),
  staleWarning: z.boolean(),
  paymentRail: z.string().nullable(),
  payer: adminV2ConsumerPartySchema,
  requester: adminV2ConsumerPartySchema,
  dueDate: z.string().nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  attachmentsCount: z.number(),
  dataFreshnessClass: z.string(),
  assignedTo: adminV2AdminRefSchema.nullable(),
});

const adminV2PaymentOperationsQueueItemSchema = adminV2PaymentQueueItemSchema.extend({
  invoiceTaggedAttachmentsCount: z.number(),
  followUpReason: z.string(),
});

export const adminV2PaymentOperationsQueueResponseSchema = z.object({
  generatedAt: isoDateTimeSchema,
  posture: z.object({
    kind: z.string(),
    wording: z.string(),
  }),
  buckets: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      operatorPrompt: z.string(),
      items: z.array(adminV2PaymentOperationsQueueItemSchema),
    }),
  ),
});

export type AdminV2PaymentsListResponse = {
  items: Array<z.infer<typeof adminV2PaymentQueueItemSchema>>;
  pageInfo: z.infer<typeof adminV2CursorPageInfoSchema>;
};

export const adminV2PaymentsListResponseSchema = z.object({
  items: z.array(adminV2PaymentQueueItemSchema),
  pageInfo: adminV2CursorPageInfoSchema,
});

export type AdminV2PaymentCaseResponse = {
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
  payer: { id: string | null; email: string | null };
  requester: { id: string | null; email: string | null };
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
  timeline: Array<z.infer<typeof adminV2PaymentTimelineItemSchema>>;
  auditContext: Array<z.infer<typeof adminV2AuditContextItemSchema>>;
  assignment: AdminV2AssignmentContext;
  version: number;
  updatedAt: string;
  staleWarning: boolean;
  dataFreshnessClass: string;
};

export const adminV2PaymentCaseResponseSchema = z.object({
  id: z.string(),
  core: z.object({
    id: z.string(),
    amount: z.string(),
    currencyCode: z.string(),
    persistedStatus: z.string(),
    effectiveStatus: z.string(),
    paymentRail: z.string().nullable(),
    description: z.string().nullable(),
    dueDate: z.string().nullable(),
    sentDate: z.string().nullable(),
    createdAt: isoDateTimeSchema,
    deletedAt: nullableIsoDateTimeSchema,
  }),
  payer: adminV2ConsumerPartySchema,
  requester: adminV2ConsumerPartySchema,
  attachments: z.array(
    z.object({
      id: z.string(),
      resourceId: z.string(),
      name: z.string(),
      size: z.number(),
      mimetype: z.string(),
      downloadUrl: z.string(),
      createdAt: isoDateTimeSchema,
      deletedAt: nullableIsoDateTimeSchema,
      resourceDeletedAt: nullableIsoDateTimeSchema,
    }),
  ),
  ledgerEntries: z.array(
    z.object({
      id: z.string(),
      ledgerId: z.string(),
      type: z.string(),
      amount: z.string(),
      currencyCode: z.string(),
      effectiveStatus: z.string(),
      createdAt: isoDateTimeSchema,
      deletedAt: nullableIsoDateTimeSchema,
    }),
  ),
  timeline: z.array(adminV2PaymentTimelineItemSchema),
  auditContext: z.array(adminV2AuditContextItemSchema),
  assignment: adminV2AssignmentContextSchema,
  version: z.number(),
  updatedAt: isoDateTimeSchema,
  staleWarning: z.boolean(),
  dataFreshnessClass: z.string(),
});

export type AdminV2PaymentMethodsListResponse = {
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
    consumer: { id: string; email: string | null };
  }>;
  total: number;
  page: number;
  pageSize: number;
};

const adminV2PaymentMethodListItemSchema = z.object({
  id: z.string(),
  type: z.string(),
  brand: z.string().nullable(),
  last4: z.string().nullable(),
  bankLast4: z.string().nullable(),
  status: z.string(),
  defaultSelected: z.boolean(),
  stripeFingerprint: z.string().nullable(),
  disabledAt: nullableIsoDateTimeSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  deletedAt: nullableIsoDateTimeSchema,
  consumer: adminV2ConsumerRefSchema,
});

export const adminV2PaymentMethodsListResponseSchema = z.object({
  items: z.array(adminV2PaymentMethodListItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export type AdminV2PayoutsListResponse = {
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
  highValuePolicy: {
    availability: string;
    source: string;
    wording: string;
    configuredThresholds: Array<{
      currencyCode: string;
      amount: string;
    }>;
  };
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
    consumer: { id: string; email: string | null };
    paymentRequestId: string | null;
    createdAt: string;
    updatedAt: string;
    staleWarning: boolean;
    dataFreshnessClass: string;
    outcomeAgeHours: number;
    slaBreachDetected: boolean;
    highValue: {
      eligibility: string;
      thresholdAmount: string | null;
      thresholdCurrency: string;
    };
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
    assignedTo: AdminV2AdminRef | null;
  }>;
  pageInfo: z.infer<typeof adminV2CursorPageInfoSchema>;
};

const adminV2HighValuePolicySchema = z.object({
  availability: z.string(),
  source: z.string(),
  wording: z.string(),
  configuredThresholds: z.array(
    z.object({
      currencyCode: z.string(),
      amount: z.string(),
    }),
  ),
});

const adminV2HighValueAssessmentSchema = z.object({
  eligibility: z.string(),
  thresholdAmount: z.string().nullable(),
  thresholdCurrency: z.string(),
});

const adminV2StuckPolicySchema = z.object({
  thresholdHours: z.number(),
  breachCondition: z.string(),
  escalationTarget: z.string(),
  expectedOperatorReaction: z.string(),
  automationStatus: z.string(),
});

const adminV2DestinationPaymentMethodSummarySchema = z.object({
  id: z.string(),
  type: z.string(),
  brand: z.string().nullable(),
  last4: z.string().nullable(),
  bankLast4: z.string().nullable(),
  deletedAt: nullableIsoDateTimeSchema,
});

const adminV2PayoutListItemSchema = z.object({
  id: z.string(),
  ledgerId: z.string(),
  type: z.string(),
  amount: z.string(),
  currencyCode: z.string(),
  persistedStatus: z.string(),
  effectiveStatus: z.string(),
  derivedStatus: z.string(),
  externalReference: z.string().nullable(),
  consumer: adminV2ConsumerRefSchema,
  paymentRequestId: z.string().nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  staleWarning: z.boolean(),
  dataFreshnessClass: z.string(),
  outcomeAgeHours: z.number(),
  slaBreachDetected: z.boolean(),
  highValue: adminV2HighValueAssessmentSchema,
  hasActiveEscalation: z.boolean(),
  destinationAvailability: z.string(),
  destinationLinkageSource: z.string().nullable(),
  destinationPaymentMethodSummary: adminV2DestinationPaymentMethodSummarySchema.nullable(),
  assignedTo: adminV2AdminRefSchema.nullable(),
});

export const adminV2PayoutsListResponseSchema = z.object({
  generatedAt: isoDateTimeSchema,
  posture: z.object({
    kind: z.string(),
    wording: z.string(),
  }),
  stuckPolicy: adminV2StuckPolicySchema,
  highValuePolicy: adminV2HighValuePolicySchema,
  items: z.array(adminV2PayoutListItemSchema),
  pageInfo: adminV2CursorPageInfoSchema,
});

export type AdminV2PayoutCaseResponse = {
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
  consumer: { id: string; email: string | null };
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
  metadata: z.infer<typeof jsonObjectSchema>;
  outcomes: Array<z.infer<typeof adminV2OutcomeItemSchema>>;
  relatedEntries: Array<z.infer<typeof adminV2RelatedLedgerEntrySchema>>;
  auditContext: Array<z.infer<typeof adminV2AuditContextItemSchema>>;
  assignment: AdminV2AssignmentContext;
  outcomeAgeHours: number;
  slaBreachDetected: boolean;
  version: number;
  stuckPolicy: z.infer<typeof adminV2StuckPolicySchema>;
  highValuePolicy: z.infer<typeof adminV2HighValuePolicySchema>;
  highValue: z.infer<typeof adminV2HighValueAssessmentSchema>;
  payoutEscalation: {
    id: string;
    reason: string | null;
    confirmed: boolean;
    createdAt: string;
    escalatedBy: { id: string; email: string | null };
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
  destinationPaymentMethodSummary: z.infer<typeof adminV2DestinationPaymentMethodSummarySchema> | null;
};

export const adminV2PayoutCaseResponseSchema = z.object({
  id: z.string(),
  core: z.object({
    id: z.string(),
    ledgerId: z.string(),
    type: z.string(),
    amount: z.string(),
    currencyCode: z.string(),
    persistedStatus: z.string(),
    effectiveStatus: z.string(),
    derivedStatus: z.string(),
    externalReference: z.string().nullable(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  }),
  consumer: adminV2ConsumerRefSchema,
  paymentRequest: z
    .object({
      id: z.string(),
      amount: z.string(),
      currencyCode: z.string(),
      status: z.string(),
      paymentRail: z.string().nullable(),
      payerId: z.string().nullable(),
      payerEmail: z.string().nullable(),
      requesterId: z.string().nullable(),
      requesterEmail: z.string().nullable(),
    })
    .nullable(),
  metadata: jsonObjectSchema,
  outcomes: z.array(adminV2OutcomeItemSchema),
  relatedEntries: z.array(adminV2RelatedLedgerEntrySchema),
  auditContext: z.array(adminV2AuditContextItemSchema),
  assignment: adminV2AssignmentContextSchema,
  outcomeAgeHours: z.number(),
  slaBreachDetected: z.boolean(),
  version: z.number(),
  stuckPolicy: adminV2StuckPolicySchema,
  highValuePolicy: adminV2HighValuePolicySchema,
  highValue: adminV2HighValueAssessmentSchema,
  payoutEscalation: z
    .object({
      id: z.string(),
      reason: z.string().nullable(),
      confirmed: z.boolean(),
      createdAt: isoDateTimeSchema,
      escalatedBy: adminV2NullableAdminEmailRefSchema,
    })
    .nullable(),
  actionControls: z.object({
    canEscalate: z.boolean(),
    allowedActions: z.array(z.string()),
    escalateBlockedReason: z.string().nullable(),
  }),
  staleWarning: z.boolean(),
  dataFreshnessClass: z.string(),
  destinationAvailability: z.string(),
  destinationLinkageSource: z.string().nullable(),
  destinationPaymentMethodSummary: adminV2DestinationPaymentMethodSummarySchema.nullable(),
});

export type AdminV2PaymentMethodCaseResponse = {
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
  consumer: { id: string; email: string | null };
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
    escalatedBy: { id: string; email: string | null };
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
    consumer: { id: string; email: string | null };
  }>;
};

export const adminV2PaymentMethodCaseResponseSchema = z.object({
  id: z.string(),
  type: z.string(),
  status: z.string(),
  stripePaymentMethodId: z.string().nullable(),
  stripeFingerprint: z.string().nullable(),
  defaultSelected: z.boolean(),
  version: z.number(),
  brand: z.string().nullable(),
  last4: z.string().nullable(),
  expMonth: z.string().nullable(),
  expYear: z.string().nullable(),
  bankName: z.string().nullable(),
  bankLast4: z.string().nullable(),
  bankCountry: z.string().nullable(),
  bankCurrency: z.string().nullable(),
  serviceFee: z.number(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  disabledAt: nullableIsoDateTimeSchema,
  disabledBy: z.string().nullable(),
  deletedAt: nullableIsoDateTimeSchema,
  consumer: adminV2ConsumerRefSchema,
  billingDetails: z
    .object({
      id: z.string(),
      email: z.string().nullable(),
      name: z.string().nullable(),
      phone: z.string().nullable(),
      deletedAt: nullableIsoDateTimeSchema,
    })
    .nullable(),
  duplicateEscalation: z
    .object({
      id: z.string(),
      fingerprint: z.string(),
      duplicateCount: z.number(),
      duplicatePaymentMethodIds: z.array(z.string()),
      createdAt: isoDateTimeSchema,
      escalatedBy: adminV2NullableAdminEmailRefSchema,
    })
    .nullable(),
  fingerprintDuplicates: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      brand: z.string().nullable(),
      last4: z.string().nullable(),
      bankLast4: z.string().nullable(),
      defaultSelected: z.boolean(),
      createdAt: isoDateTimeSchema,
      deletedAt: nullableIsoDateTimeSchema,
      consumer: adminV2ConsumerRefSchema,
    }),
  ),
});

export type AdminV2DocumentsListResponse = {
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
    assignedTo: AdminV2AdminRef | null;
  }>;
  total: number;
  page: number;
  pageSize: number;
};

export const adminV2DocumentsListResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      originalName: z.string(),
      access: z.string(),
      mimeType: z.string(),
      size: z.number(),
      consumerId: z.string().nullable(),
      consumerEmail: z.string().nullable(),
      createdAt: isoDateTimeSchema,
      version: z.number(),
      tags: z.array(z.string()),
      linkedPaymentRequestIds: z.array(z.string()),
      assignedTo: adminV2AdminRefSchema.nullable(),
    }),
  ),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export type AdminV2DocumentCaseResponse = {
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
  consumer: { id: string; email: string | null } | null;
  tags: Array<{ id: string; name: string }>;
  linkedPaymentRequests: Array<z.infer<typeof adminV2LinkedPaymentRequestSchema>>;
  downloadUrl: string;
  version: number;
  updatedAt: string;
  staleWarning: boolean;
  dataFreshnessClass: string;
  assignment: AdminV2AssignmentContext;
};

export const adminV2DocumentCaseResponseSchema = z.object({
  id: z.string(),
  core: z.object({
    id: z.string(),
    originalName: z.string(),
    access: z.string(),
    mimeType: z.string(),
    size: z.number(),
    createdAt: isoDateTimeSchema,
    deletedAt: nullableIsoDateTimeSchema,
  }),
  consumer: adminV2ConsumerRefSchema.nullable(),
  tags: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
    }),
  ),
  linkedPaymentRequests: z.array(adminV2LinkedPaymentRequestSchema),
  downloadUrl: z.string(),
  version: z.number(),
  updatedAt: isoDateTimeSchema,
  staleWarning: z.boolean(),
  dataFreshnessClass: z.string(),
  assignment: adminV2AssignmentContextSchema,
});

export type AdminV2DocumentTagsResponse = {
  items: Array<z.infer<typeof adminV2DocumentTagItemSchema>>;
};

export const adminV2DocumentTagsResponseSchema = z.object({
  items: z.array(adminV2DocumentTagItemSchema),
});

export type AdminV2ExchangeRatesListResponse = {
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

const adminV2ExchangeStalenessIndicatorSchema = z.object({
  isStale: z.boolean(),
  referenceAt: isoDateTimeSchema,
  ageMinutes: z.number(),
});

export const adminV2ExchangeRatesListResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      sourceCurrency: z.string(),
      targetCurrency: z.string(),
      rate: z.string(),
      inverseRate: z.string().nullable(),
      spreadBps: z.number().nullable(),
      confidence: z.number().nullable(),
      status: z.string(),
      provider: z.string().nullable(),
      effectiveAt: isoDateTimeSchema,
      fetchedAt: nullableIsoDateTimeSchema,
      expiresAt: nullableIsoDateTimeSchema,
      approvedAt: nullableIsoDateTimeSchema,
      createdAt: isoDateTimeSchema,
      updatedAt: isoDateTimeSchema,
      stalenessIndicator: adminV2ExchangeStalenessIndicatorSchema,
      version: z.number(),
    }),
  ),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export type AdminV2ExchangeRateCaseResponse = {
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
    admin: { id: string; email: string | null };
    metadata: z.infer<typeof jsonObjectSchema>;
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

export const adminV2ExchangeRateCaseResponseSchema = z.object({
  id: z.string(),
  core: z.object({
    id: z.string(),
    sourceCurrency: z.string(),
    targetCurrency: z.string(),
    rate: z.string(),
    inverseRate: z.string().nullable(),
    spreadBps: z.number().nullable(),
    confidence: z.number().nullable(),
    status: z.string(),
    provider: z.string().nullable(),
    providerRateId: z.string().nullable(),
    fetchedAt: nullableIsoDateTimeSchema,
    effectiveAt: isoDateTimeSchema,
    expiresAt: nullableIsoDateTimeSchema,
    approvedAt: nullableIsoDateTimeSchema,
    approvedBy: z.string().nullable(),
    createdAt: isoDateTimeSchema,
    deletedAt: nullableIsoDateTimeSchema,
  }),
  approvalHistory: z.array(
    z.object({
      id: z.string(),
      action: z.string(),
      createdAt: isoDateTimeSchema,
      admin: adminV2NullableAdminEmailRefSchema,
      metadata: jsonObjectSchema,
    }),
  ),
  stalenessIndicator: z.object({
    isStale: z.boolean(),
    ageMinutes: z.number(),
    referenceAt: isoDateTimeSchema,
    thresholdMinutes: z.number(),
  }),
  actionControls: z.object({
    canApprove: z.boolean(),
    allowedActions: z.array(z.string()),
  }),
  version: z.number(),
  updatedAt: isoDateTimeSchema,
  staleWarning: z.boolean(),
  dataFreshnessClass: z.string(),
});

export type AdminV2ExchangeRulesListResponse = {
  items: Array<{
    id: string;
    consumer: { id: string; email: string | null };
    sourceCurrency: string;
    targetCurrency: string;
    threshold: string;
    maxConvertAmount: string | null;
    minIntervalMinutes: number;
    enabled: boolean;
    nextRunAt: string | null;
    lastRunAt: string | null;
    lastExecution: z.infer<typeof jsonObjectSchema> | null;
    version: number;
    updatedAt: string;
  }>;
  total: number;
  page: number;
  pageSize: number;
};

export const adminV2ExchangeRulesListResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      consumer: adminV2ConsumerRefSchema,
      sourceCurrency: z.string(),
      targetCurrency: z.string(),
      threshold: z.string(),
      maxConvertAmount: z.string().nullable(),
      minIntervalMinutes: z.number(),
      enabled: z.boolean(),
      nextRunAt: nullableIsoDateTimeSchema,
      lastRunAt: nullableIsoDateTimeSchema,
      lastExecution: jsonObjectSchema.nullable(),
      version: z.number(),
      updatedAt: isoDateTimeSchema,
    }),
  ),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export type AdminV2ExchangeRuleCaseResponse = {
  id: string;
  consumer: { id: string; email: string | null };
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
  lastExecution: z.infer<typeof jsonObjectSchema> | null;
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

export const adminV2ExchangeRuleCaseResponseSchema = z.object({
  id: z.string(),
  consumer: adminV2ConsumerRefSchema,
  core: z.object({
    id: z.string(),
    sourceCurrency: z.string(),
    targetCurrency: z.string(),
    threshold: z.string(),
    maxConvertAmount: z.string().nullable(),
    minIntervalMinutes: z.number(),
    enabled: z.boolean(),
    nextRunAt: nullableIsoDateTimeSchema,
    lastRunAt: nullableIsoDateTimeSchema,
    createdAt: isoDateTimeSchema,
  }),
  lastExecution: jsonObjectSchema.nullable(),
  actionControls: z.object({
    canPause: z.boolean(),
    canResume: z.boolean(),
    canRunNow: z.boolean(),
    allowedActions: z.array(z.string()),
  }),
  version: z.number(),
  updatedAt: isoDateTimeSchema,
  staleWarning: z.boolean(),
  dataFreshnessClass: z.string(),
});

export type AdminV2ExchangeScheduledListResponse = {
  items: Array<{
    id: string;
    consumer: { id: string; email: string | null };
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
    assignedTo: AdminV2AdminRef | null;
  }>;
  total: number;
  page: number;
  pageSize: number;
};

const adminV2ExchangeScheduledListItemSchema = z.object({
  id: z.string(),
  consumer: adminV2ConsumerRefSchema,
  amount: z.string(),
  sourceCurrency: z.string(),
  targetCurrency: z.string(),
  status: z.string(),
  attempts: z.number(),
  retryCount: z.number(),
  executeAt: isoDateTimeSchema,
  processingAt: nullableIsoDateTimeSchema,
  executedAt: nullableIsoDateTimeSchema,
  failedAt: nullableIsoDateTimeSchema,
  failureDetail: z.string().nullable(),
  linkedRuleId: z.string().nullable(),
  ledgerId: z.string().nullable(),
  linkedLedgerEntry: z
    .object({
      id: z.string(),
      type: z.string(),
      amount: z.string(),
      currencyCode: z.string(),
    })
    .nullable(),
  version: z.number(),
  updatedAt: isoDateTimeSchema,
  assignedTo: adminV2AdminRefSchema.nullable(),
});

export const adminV2ExchangeScheduledListResponseSchema = z.object({
  items: z.array(adminV2ExchangeScheduledListItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export type AdminV2ExchangeScheduledCaseResponse = {
  id: string;
  consumer: { id: string; email: string | null };
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
  linkedLedgerEntries: Array<z.infer<typeof adminV2RelatedLedgerEntrySchema>>;
  actionControls: {
    canForceExecute: boolean;
    canCancel: boolean;
    allowedActions: string[];
  };
  version: number;
  updatedAt: string;
  staleWarning: boolean;
  dataFreshnessClass: string;
  assignment: AdminV2AssignmentContext;
};

export const adminV2ExchangeScheduledCaseResponseSchema = z.object({
  id: z.string(),
  consumer: adminV2ConsumerRefSchema,
  core: z.object({
    id: z.string(),
    sourceCurrency: z.string(),
    targetCurrency: z.string(),
    amount: z.string(),
    status: z.string(),
    attempts: z.number(),
    executeAt: isoDateTimeSchema,
    processingAt: nullableIsoDateTimeSchema,
    executedAt: nullableIsoDateTimeSchema,
    failedAt: nullableIsoDateTimeSchema,
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  }),
  failureDetail: z.string().nullable(),
  linkedRuleId: z.string().nullable(),
  linkedLedgerEntries: z.array(adminV2RelatedLedgerEntrySchema),
  actionControls: z.object({
    canForceExecute: z.boolean(),
    canCancel: z.boolean(),
    allowedActions: z.array(z.string()),
  }),
  version: z.number(),
  updatedAt: isoDateTimeSchema,
  staleWarning: z.boolean(),
  dataFreshnessClass: z.string(),
  assignment: adminV2AssignmentContextSchema,
});

export type AdminV2LedgerEntriesListResponse = {
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
    assignedTo: AdminV2AdminRef | null;
  }>;
  pageInfo: z.infer<typeof adminV2CursorPageInfoSchema>;
};

const adminV2LedgerEntryListItemSchema = z.object({
  id: z.string(),
  ledgerId: z.string(),
  type: z.string(),
  amount: z.string(),
  currencyCode: z.string(),
  persistedStatus: z.string(),
  effectiveStatus: z.string(),
  paymentRail: z.string().nullable(),
  consumerId: z.string(),
  consumerEmail: z.string().nullable(),
  paymentRequestId: z.string().nullable(),
  paymentRequestStatus: z.string().nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  disputeCount: z.number(),
  staleWarning: z.boolean(),
  dataFreshnessClass: z.string(),
  assignedTo: adminV2AdminRefSchema.nullable(),
});

export const adminV2LedgerEntriesListResponseSchema = z.object({
  items: z.array(adminV2LedgerEntryListItemSchema),
  pageInfo: adminV2CursorPageInfoSchema,
});

export type AdminV2LedgerEntryCaseResponse = {
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
  consumer: { id: string; email: string | null };
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
  metadata: z.infer<typeof jsonObjectSchema>;
  outcomes: Array<z.infer<typeof adminV2OutcomeItemSchema>>;
  disputes: Array<{
    id: string;
    stripeDisputeId: string;
    metadata: z.infer<typeof jsonObjectSchema>;
    createdAt: string;
  }>;
  relatedEntries: Array<z.infer<typeof adminV2RelatedLedgerEntrySchema>>;
  auditContext: Array<z.infer<typeof adminV2AuditContextItemSchema>>;
  assignment: AdminV2AssignmentContext;
  staleWarning: boolean;
  dataFreshnessClass: string;
};

export const adminV2LedgerEntryCaseResponseSchema = z.object({
  id: z.string(),
  core: z.object({
    id: z.string(),
    ledgerId: z.string(),
    type: z.string(),
    amount: z.string(),
    currencyCode: z.string(),
    persistedStatus: z.string(),
    effectiveStatus: z.string(),
    paymentRail: z.string().nullable(),
    feesType: z.string().nullable(),
    feesAmount: z.string().nullable(),
    stripeId: z.string().nullable(),
    idempotencyKey: z.string().nullable(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  }),
  consumer: adminV2ConsumerRefSchema,
  paymentRequest: z
    .object({
      id: z.string(),
      amount: z.string(),
      currencyCode: z.string(),
      status: z.string(),
      paymentRail: z.string().nullable(),
      payerId: z.string().nullable(),
      payerEmail: z.string().nullable(),
      requesterId: z.string().nullable(),
      requesterEmail: z.string().nullable(),
    })
    .nullable(),
  metadata: jsonObjectSchema,
  outcomes: z.array(adminV2OutcomeItemSchema),
  disputes: z.array(
    z.object({
      id: z.string(),
      stripeDisputeId: z.string(),
      metadata: jsonObjectSchema,
      createdAt: isoDateTimeSchema,
    }),
  ),
  relatedEntries: z.array(adminV2RelatedLedgerEntrySchema),
  auditContext: z.array(adminV2AuditContextItemSchema),
  assignment: adminV2AssignmentContextSchema,
  staleWarning: z.boolean(),
  dataFreshnessClass: z.string(),
});

export type AdminV2LedgerDisputesResponse = {
  items: Array<{
    id: string;
    stripeDisputeId: string;
    disputeStatus: string | null;
    reason: string | null;
    amountMinor: number | null;
    updatedAt: string | null;
    createdAt: string;
    metadata: z.infer<typeof jsonObjectSchema>;
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
  pageInfo: z.infer<typeof adminV2CursorPageInfoSchema>;
};

export const adminV2LedgerDisputesResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      stripeDisputeId: z.string(),
      disputeStatus: z.string().nullable(),
      reason: z.string().nullable(),
      amountMinor: z.number().nullable(),
      updatedAt: nullableIsoDateTimeSchema,
      createdAt: isoDateTimeSchema,
      metadata: jsonObjectSchema,
      ledgerEntry: z.object({
        id: z.string(),
        ledgerId: z.string(),
        paymentRequestId: z.string().nullable(),
        consumerId: z.string(),
        type: z.string(),
        amount: z.string(),
        currencyCode: z.string(),
        paymentRail: z.string().nullable(),
      }),
      dataFreshnessClass: z.string(),
    }),
  ),
  pageInfo: adminV2CursorPageInfoSchema,
});

export const adminV2LedgerAnomalyEntrySchema = z.object({
  id: z.string(),
  ledgerEntryId: z.string(),
  consumerId: z.string(),
  type: z.string(),
  amount: z.string(),
  currencyCode: z.string(),
  entryStatus: z.string(),
  outcomeStatus: z.string().nullable(),
  outcomeAt: nullableIsoDateTimeSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  signal: z.object({
    class: z.enum(ADMIN_V2_LEDGER_ANOMALY_CLASSES),
    detail: z.string(),
  }),
});

export const adminV2LedgerAnomalySummaryResponseSchema = z.object({
  computedAt: isoDateTimeSchema,
  classes: z.record(
    z.enum(ADMIN_V2_LEDGER_ANOMALY_CLASSES),
    z.object({
      label: z.string(),
      count: z.number().nullable(),
      phaseStatus: z.literal(`live-actionable`),
      availability: z.enum([`available`, `temporarily-unavailable`]),
      href: z.string(),
    }),
  ),
  totalCount: z.number().nullable(),
});

export const adminV2LedgerAnomalyListResponseSchema = z.object({
  class: z.enum(ADMIN_V2_LEDGER_ANOMALY_CLASSES),
  items: z.array(adminV2LedgerAnomalyEntrySchema),
  nextCursor: z.string().nullable(),
  computedAt: isoDateTimeSchema,
});

export type AdminV2VerificationQueueResponse = {
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
    assignedTo: AdminV2AdminRef | null;
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

const adminV2VerificationQueueItemSchema = z.object({
  id: z.string(),
  email: z.string(),
  accountType: z.string(),
  contractorKind: z.string().nullable(),
  verificationStatus: z.string(),
  stripeIdentityStatus: z.string().nullable(),
  country: z.string().nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  verificationUpdatedAt: nullableIsoDateTimeSchema,
  missingProfileData: z.boolean(),
  missingDocuments: z.boolean(),
  documentsCount: z.number(),
  slaBreached: z.boolean(),
  assignedTo: adminV2AdminRefSchema.nullable(),
});

export const adminV2VerificationQueueResponseSchema = z.object({
  items: z.array(adminV2VerificationQueueItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  activeStatuses: z.array(z.string()),
  sla: z.object({
    breachedCount: z.number(),
    thresholdHours: z.number(),
    lastComputedAt: nullableIsoDateTimeSchema,
  }),
});

export type AdminV2VerificationCaseResponse = AdminV2ConsumerCaseResponse & {
  version: number;
  decisionControls: {
    canForceLogout: boolean;
    canDecide: boolean;
    allowedActions: string[];
    canManageAssignments: boolean;
    canReassignAssignments: boolean;
  };
  decisionHistory: Array<z.infer<typeof adminV2DecisionHistoryItemSchema>>;
  authRisk: {
    loginFailures24h: number;
    refreshReuse30d: number;
    recentEvents: Array<AdminV2AuthAuditRow>;
  };
  verificationSla: {
    breached: boolean;
    thresholdHours: number;
    lastComputedAt: string | null;
  };
  assignment: AdminV2AssignmentContext;
};

export const adminV2VerificationCaseResponseSchema = adminV2ConsumerCaseResponseSchemaBase.extend({
  version: z.number(),
  decisionControls: z.object({
    canForceLogout: z.boolean(),
    canDecide: z.boolean(),
    allowedActions: z.array(z.string()),
    canManageAssignments: z.boolean(),
    canReassignAssignments: z.boolean(),
  }),
  decisionHistory: z.array(adminV2DecisionHistoryItemSchema),
  authRisk: z.object({
    loginFailures24h: z.number(),
    refreshReuse30d: z.number(),
    recentEvents: z.array(adminV2AuthAuditRowSchema),
  }),
  verificationSla: z.object({
    breached: z.boolean(),
    thresholdHours: z.number(),
    lastComputedAt: nullableIsoDateTimeSchema,
  }),
  assignment: adminV2AssignmentContextSchema,
});

export type AdminV2ConsumerContractsResponse = {
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

export const adminV2ConsumerContractsResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      lastRequestId: z.string().nullable(),
      lastStatus: z.string().nullable(),
      lastActivity: nullableIsoDateTimeSchema,
      docs: z.number(),
      paymentsCount: z.number(),
      completedPaymentsCount: z.number(),
    }),
  ),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export type AdminV2ConsumerLedgerSummaryResponse = {
  consumerId: string;
  summary: Record<string, z.infer<typeof adminV2CountSummarySchema>>;
};

export const adminV2ConsumerLedgerSummaryResponseSchema = z.object({
  consumerId: z.string(),
  summary: z.record(z.string(), adminV2CountSummarySchema),
});

export type AdminV2ConsumerTimelineResponse = {
  items: Array<AdminV2AuthAuditRow | AdminV2ConsumerActionAuditRow>;
  total: number;
  page: number;
  pageSize: number;
  dateFrom?: string;
  dateTo?: string;
};

export const adminV2ConsumerTimelineResponseSchema = z.object({
  items: z.array(z.union([adminV2AuthAuditRowSchema, adminV2ConsumerActionAuditRowSchema])),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export type AdminV2AdminsListResponse = {
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

const adminV2PendingInvitationSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: z.string(),
  status: z.enum([`pending`, `expired`, `accepted`]),
  expiresAt: nullableIsoDateTimeSchema,
  createdAt: isoDateTimeSchema,
  invitedBy: adminV2AdminEmailRefSchema.nullable(),
});

export const adminV2AdminsListResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      email: z.string(),
      type: z.string(),
      role: z.string().nullable(),
      status: z.enum([`ACTIVE`, `INACTIVE`]),
      lastActivityAt: nullableIsoDateTimeSchema,
      createdAt: isoDateTimeSchema,
      updatedAt: isoDateTimeSchema,
      deletedAt: nullableIsoDateTimeSchema,
    }),
  ),
  pendingInvitations: z.array(adminV2PendingInvitationSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export type AdminV2AdminCaseRecordResponse = {
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
    metadata: z.infer<typeof jsonObjectSchema> | null;
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

export const adminV2AdminCaseRecordResponseSchema = z.object({
  id: z.string(),
  core: z.object({
    id: z.string(),
    email: z.string(),
    type: z.string(),
    role: z.string().nullable(),
    status: z.enum([`ACTIVE`, `INACTIVE`]),
    createdAt: isoDateTimeSchema,
    deletedAt: nullableIsoDateTimeSchema,
  }),
  accessProfile: z.object({
    source: z.string(),
    resolvedRole: z.string().nullable(),
    capabilities: z.array(z.string()),
    workspaces: z.array(z.string()),
    schemaRoleKey: z.string().nullable(),
    availablePermissionCapabilities: z.array(z.string()),
    permissionOverrides: z.array(
      z.object({
        capability: z.string(),
        granted: z.boolean(),
      }),
    ),
  }),
  settings: z
    .object({
      id: z.string(),
      theme: z.string(),
      createdAt: isoDateTimeSchema,
      updatedAt: isoDateTimeSchema,
    })
    .nullable(),
  authoredNotesCount: z.number(),
  authoredFlagsCount: z.number(),
  recentAuditActions: z.array(
    z.object({
      id: z.string(),
      action: z.string(),
      resource: z.string(),
      resourceId: z.string().nullable(),
      metadata: jsonObjectSchema.nullable(),
      actorEmail: z.string(),
      createdAt: isoDateTimeSchema,
    }),
  ),
  recentAuthEvents: z.array(
    z.object({
      id: z.string(),
      event: z.string(),
      ipAddress: z.string().nullable(),
      userAgent: z.string().nullable(),
      createdAt: isoDateTimeSchema,
    }),
  ),
  invitations: z.array(
    z.object({
      id: z.string(),
      email: z.string(),
      role: z.string(),
      status: z.enum([`pending`, `expired`, `accepted`]),
      expiresAt: nullableIsoDateTimeSchema,
      acceptedAt: nullableIsoDateTimeSchema,
      createdAt: isoDateTimeSchema,
    }),
  ),
  auditShortcuts: z.object({
    adminActionsHref: z.string(),
    authHref: z.string(),
  }),
  version: z.number(),
  updatedAt: isoDateTimeSchema,
  staleWarning: z.boolean(),
  dataFreshnessClass: z.string(),
});

export type AdminV2AdminSessionInvalidatedReason =
  | `rotated`
  | `manual_revoke`
  | `cross_admin_revoked`
  | `logout`
  | `refresh_reuse_detected`
  | `password_reset`
  | `admin_deactivated`;

export type AdminV2AdminSessionView = {
  id: string;
  sessionFamilyId: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  revokedAt: string | null;
  invalidatedReason: AdminV2AdminSessionInvalidatedReason | null;
  replacedById: string | null;
  current?: boolean;
};

const adminV2AdminSessionViewSchema = z.object({
  id: z.string(),
  sessionFamilyId: z.string(),
  createdAt: isoDateTimeSchema,
  lastUsedAt: isoDateTimeSchema,
  expiresAt: isoDateTimeSchema,
  revokedAt: nullableIsoDateTimeSchema,
  invalidatedReason: z
    .enum([
      `rotated`,
      `manual_revoke`,
      `cross_admin_revoked`,
      `logout`,
      `refresh_reuse_detected`,
      `password_reset`,
      `admin_deactivated`,
    ])
    .nullable(),
  replacedById: z.string().nullable(),
  current: z.boolean().optional(),
});

export type AdminV2ListAdminSessionsResponse = { sessions: AdminV2AdminSessionView[] };

export const adminV2ListAdminSessionsResponseSchema = z.object({
  sessions: z.array(adminV2AdminSessionViewSchema),
});

export type { AdminV2AdminRef, AdminV2OperationalAlertThreshold };
