import { z } from 'zod';

import { ADMIN_V2_LEDGER_ANOMALY_CLASSES } from './ledger-anomalies';
import {
  adminV2OperationalAlertSummaryWorkspaceSchema,
  adminV2OperationalAlertThresholdQueryPayloadSchema,
  adminV2OperationalAlertThresholdSchema,
  type AdminV2OperationalAlertThreshold,
} from './operational-alerts';
import { ADMIN_V2_SAVED_VIEW_WORKSPACES } from './saved-views';
import { jsonObjectSchema } from '../validation';

const isoDateTimeSchema = z.string();
const nullableIsoDateTimeSchema = isoDateTimeSchema.nullable();
const stringOrNullSchema = z.string().nullable();

const adminV2AdminRefSchema = z.object({
  id: z.string(),
  name: stringOrNullSchema,
  email: stringOrNullSchema,
});
const adminV2AssignmentSummarySchema = z.object({
  id: z.string(),
  assignedTo: adminV2AdminRefSchema,
  assignedBy: adminV2AdminRefSchema.nullable(),
  assignedAt: isoDateTimeSchema,
  reason: stringOrNullSchema,
  expiresAt: nullableIsoDateTimeSchema,
});

const adminV2AssignmentHistoryItemSchema = adminV2AssignmentSummarySchema.extend({
  releasedAt: nullableIsoDateTimeSchema,
  releasedBy: adminV2AdminRefSchema.nullable(),
});

const adminV2AssignmentContextSchema = z.object({
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
  .loose();

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
  .loose();

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
  .loose();

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
  .loose();

const adminV2DecisionHistoryItemSchema = z
  .object({
    id: z.string(),
    action: z.string(),
    adminId: z.string().nullable().optional(),
    admin: adminV2NullableAdminEmailRefSchema.partial().optional(),
    metadata: adminV2TimelineMetadataSchema.optional(),
    createdAt: isoDateTimeSchema,
  })
  .loose();

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
  workspace: adminV2OperationalAlertSummaryWorkspaceSchema,
  name: z.string(),
  description: z.string().nullable(),
  queryPayload: adminV2OperationalAlertThresholdQueryPayloadSchema,
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
  queryPayload: adminV2OperationalAlertThresholdQueryPayloadSchema,
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

export const adminV2AuditListResponseSchema = z.object({
  items: z.array(
    z.union([adminV2AuthAuditRowSchema, adminV2AdminActionAuditRowSchema, adminV2ConsumerActionAuditRowSchema]),
  ),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

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

export const adminV2PaymentsListResponseSchema = z.object({
  items: z.array(adminV2PaymentQueueItemSchema),
  pageInfo: adminV2CursorPageInfoSchema,
});

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
export const adminV2DocumentTagsResponseSchema = z.object({
  items: z.array(adminV2DocumentTagItemSchema),
});

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

const adminV2LedgerAnomalyEntrySchema = z.object({
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

export const adminV2ConsumerLedgerSummaryResponseSchema = z.object({
  consumerId: z.string(),
  summary: z.record(z.string(), adminV2CountSummarySchema),
});

export const adminV2ConsumerTimelineResponseSchema = z.object({
  items: z.array(z.union([adminV2AuthAuditRowSchema, adminV2ConsumerActionAuditRowSchema])),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

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

export const adminV2ListAdminSessionsResponseSchema = z.object({
  sessions: z.array(adminV2AdminSessionViewSchema),
});

export type AdminV2PaymentsListResponse = z.infer<typeof adminV2PaymentsListResponseSchema>;
export type AdminV2PaymentCaseResponse = z.infer<typeof adminV2PaymentCaseResponseSchema>;
export type AdminV2PaymentMethodsListResponse = z.infer<typeof adminV2PaymentMethodsListResponseSchema>;
export type AdminV2PayoutsListResponse = z.infer<typeof adminV2PayoutsListResponseSchema>;
export type AdminV2PayoutCaseResponse = z.infer<typeof adminV2PayoutCaseResponseSchema>;
export type AdminV2PaymentMethodCaseResponse = z.infer<typeof adminV2PaymentMethodCaseResponseSchema>;
export type AdminV2DocumentsListResponse = z.infer<typeof adminV2DocumentsListResponseSchema>;
export type AdminV2DocumentCaseResponse = z.infer<typeof adminV2DocumentCaseResponseSchema>;
export type AdminV2DocumentTagsResponse = z.infer<typeof adminV2DocumentTagsResponseSchema>;
export type AdminV2ExchangeRatesListResponse = z.infer<typeof adminV2ExchangeRatesListResponseSchema>;
export type AdminV2ExchangeRateCaseResponse = z.infer<typeof adminV2ExchangeRateCaseResponseSchema>;
export type AdminV2ConsumerTimelineResponse = z.infer<typeof adminV2ConsumerTimelineResponseSchema>;
export type AdminV2PaymentOperationsQueueResponse = z.infer<typeof adminV2PaymentOperationsQueueResponseSchema>;
export type AdminV2VerificationCaseResponse = z.infer<typeof adminV2VerificationCaseResponseSchema>;
export type AdminV2ConsumerCaseResponse = z.infer<typeof adminV2ConsumerCaseResponseSchema>;
export type AdminV2AuthAuditRow = z.infer<typeof adminV2AuthAuditRowSchema>;
export type AdminV2AdminActionAuditRow = z.infer<typeof adminV2AdminActionAuditRowSchema>;
export type AdminV2ConsumerActionAuditRow = z.infer<typeof adminV2ConsumerActionAuditRowSchema>;
export type AdminV2AuditListResponse = z.infer<typeof adminV2AuditListResponseSchema>;
export type AdminV2ConsumersListResponse = z.infer<typeof adminV2ConsumersListResponseSchema>;
export type AdminV2ExchangeRulesListResponse = z.infer<typeof adminV2ExchangeRulesListResponseSchema>;
export type AdminV2ExchangeRuleCaseResponse = z.infer<typeof adminV2ExchangeRuleCaseResponseSchema>;
export type AdminV2ExchangeScheduledListResponse = z.infer<typeof adminV2ExchangeScheduledListResponseSchema>;
export type AdminV2ExchangeScheduledCaseResponse = z.infer<typeof adminV2ExchangeScheduledCaseResponseSchema>;
export type AdminV2LedgerEntriesListResponse = z.infer<typeof adminV2LedgerEntriesListResponseSchema>;
export type AdminV2LedgerEntryCaseResponse = z.infer<typeof adminV2LedgerEntryCaseResponseSchema>;
export type AdminV2LedgerDisputesResponse = z.infer<typeof adminV2LedgerDisputesResponseSchema>;
export type AdminV2VerificationQueueResponse = z.infer<typeof adminV2VerificationQueueResponseSchema>;
export type AdminV2ConsumerContractsResponse = z.infer<typeof adminV2ConsumerContractsResponseSchema>;
export type AdminV2ConsumerLedgerSummaryResponse = z.infer<typeof adminV2ConsumerLedgerSummaryResponseSchema>;
export type AdminV2AdminSessionView = z.infer<typeof adminV2AdminSessionViewSchema>;
export type AdminV2ListAdminSessionsResponse = z.infer<typeof adminV2ListAdminSessionsResponseSchema>;
export type AdminV2AdminsListResponse = z.infer<typeof adminV2AdminsListResponseSchema>;
export type AdminV2AdminCaseRecordResponse = z.infer<typeof adminV2AdminCaseRecordResponseSchema>;
export type AdminV2OperationalAlertSummary = z.infer<typeof adminV2OperationalAlertSummarySchema>;
export type AdminV2OperationalAlertsListResponse = z.infer<typeof adminV2OperationalAlertsListResponseSchema>;
export type AdminV2AdminRef = z.infer<typeof adminV2AdminRefSchema>;
export type AdminV2AssignmentContext = z.infer<typeof adminV2AssignmentContextSchema>;
export type AdminV2OperationalAlertSummaryWorkspace = z.infer<typeof adminV2OperationalAlertSummaryWorkspaceSchema>;

export type { AdminV2OperationalAlertThreshold };
