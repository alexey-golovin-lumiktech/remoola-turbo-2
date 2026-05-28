import { z } from 'zod';

import { type TAccountType, type TContractorKind } from '../auth';
import { type TCurrencyCode } from '../currency';
import {
  type ConsumerDecimalString,
  type ConsumerIsoDateTime,
  type ConsumerMutationResult,
  type ConsumerPaginatedOffsetResponse,
  type ConsumerUuid,
} from './common';

export type ConsumerDashboardSummary = z.infer<typeof consumerDashboardSummarySchema>;
export type ConsumerDashboardPendingRequest = z.infer<typeof consumerDashboardPendingRequestSchema>;
export type ConsumerDashboardActivityItem = z.infer<typeof consumerDashboardActivityItemSchema>;
export type ConsumerDashboardTask = z.infer<typeof consumerDashboardTaskSchema>;
export type ConsumerDashboardQuickDoc = z.infer<typeof consumerDashboardQuickDocSchema>;
export type ConsumerDashboardVerification = z.infer<typeof consumerDashboardVerificationSchema>;
export type ConsumerDashboardData = z.infer<typeof consumerDashboardDataSchema>;

export type ConsumerDashboardDataResult = {
  data: ConsumerDashboardData | null;
  unavailable: boolean;
};

export type ConsumerPaymentsResponse = ConsumerPaginatedOffsetResponse<ConsumerPaymentsListItem>;

export type ConsumerPaymentLedgerEntry = z.infer<typeof consumerPaymentLedgerEntrySchema>;
export type ConsumerPaymentAttachment = z.infer<typeof consumerPaymentAttachmentSchema>;
export type ConsumerPaymentViewResponse = z.infer<typeof consumerPaymentViewResponseSchema>;

export type ConsumerContractsListItem = z.infer<typeof consumerContractsListItemSchema>;
export type ConsumerContractsResponse = z.infer<typeof consumerContractsResponseSchema>;

export type ConsumerProfileResponse = z.infer<typeof consumerProfileResponseSchema>;
export type ConsumerSettingsResponse = z.infer<typeof consumerSettingsResponseSchema>;
export type ConsumerDocumentItem = z.infer<typeof consumerDocumentItemSchema>;
export type ConsumerDocumentsResponse = z.infer<typeof consumerDocumentsResponseSchema>;
export type ConsumerContactResponse = {
  id: ConsumerUuid;
  name?: string | null;
  email?: string | null;
  address?: ConsumerContactAddressResponse;
};

export type ConsumerContactSearchItem = {
  id: ConsumerUuid;
  name?: string | null;
  email?: string | null;
};

export type ConsumerContactSearchResponse = ConsumerContactSearchItem[];

export type ConsumerContactsResponse = ConsumerPaginatedOffsetResponse<ConsumerContactResponse>;

export type ConsumerContactDetailsResponse = ConsumerContactResponse & {
  paymentRequests: Array<{
    id: ConsumerUuid;
    amount: ConsumerDecimalString;
    status: string;
    createdAt: ConsumerIsoDateTime;
  }>;
  documents: Array<{
    id: ConsumerUuid;
    name: string;
    downloadUrl: string;
    createdAt: ConsumerIsoDateTime;
  }>;
};

export type ConsumerContractDetailsResponse = z.infer<typeof consumerContractDetailsResponseSchema>;

export type ConsumerBillingDetailsResponse = z.infer<typeof consumerBillingDetailsResponseSchema>;
export type ConsumerPaymentMethodItem = z.infer<typeof consumerPaymentMethodItemSchema>;
export type ConsumerPaymentMethodsResponse = z.infer<typeof consumerPaymentMethodsResponseSchema>;

export type ConsumerBalanceResponse = Record<string, number>;

export type ConsumerPaymentHistoryItem = z.infer<typeof consumerPaymentHistoryItemSchema>;
export type ConsumerPaymentHistoryResponse = z.infer<typeof consumerPaymentHistoryResponseSchema>;

export type ConsumerExchangeCurrenciesResponse = ConsumerExchangeCurrency[];

export type ConsumerExchangeRate = {
  from: TCurrencyCode | string;
  to: TCurrencyCode | string;
  rate: number;
};

export type ConsumerExchangeRatesBatchResponse = {
  data: Array<
    | {
        from: TCurrencyCode | string;
        to: TCurrencyCode | string;
        rate: number;
      }
    | {
        from: TCurrencyCode | string;
        to: TCurrencyCode | string;
        code: string;
      }
  >;
};

export type ConsumerExchangeRatesBatchResult = {
  items: ConsumerExchangeRateCard[];
  unavailable: boolean;
};

export type ConsumerExchangeRule = z.infer<typeof consumerExchangeRuleSchema>;
export type ConsumerExchangeRulesResponse = z.infer<typeof consumerExchangeRulesResponseSchema>;

export type ConsumerScheduledConversion = {
  id: ConsumerUuid;
  fromCurrency: TCurrencyCode | string;
  toCurrency: TCurrencyCode | string;
  amount: number;
  executeAt: ConsumerIsoDateTime;
  status: string;
};

export type ConsumerScheduledConversionsResponse = ConsumerPaginatedOffsetResponse<ConsumerScheduledConversion>;

export type ConsumerCreatePaymentRequestResponse = {
  paymentRequestId?: ConsumerUuid;
};

export type ConsumerStartPaymentResponse = {
  paymentRequestId?: ConsumerUuid;
  ledgerId?: ConsumerUuid;
};

export type ConsumerTransferResponse = {
  ledgerId?: ConsumerUuid;
};

export type ConsumerInvoiceGenerationResponse = {
  invoiceNumber?: string;
  resourceId?: ConsumerUuid;
  downloadUrl?: string;
};

export type ConsumerVerificationSessionResponse = {
  clientSecret?: string;
  sessionId?: string;
  url?: string;
};

export type ConsumerStripeCheckoutSessionResponse = {
  url?: string;
};

export type ConsumerPayWithSavedMethodResponse = {
  success: boolean;
  paymentIntentId?: string;
  status?: string;
  nextAction?: unknown;
};

export type ConsumerStripeSetupIntentResponse = {
  clientSecret: string;
};

export type ConsumerLoginResponse = {
  ok: true;
};

export type ConsumerAuthLogoutResponse = ConsumerMutationResult;

export type ConsumerOAuthCompleteResponse = ConsumerLoginResponse & {
  next?: string;
};

export type ConsumerGoogleSignupSessionResponse = {
  email: string;
  givenName?: string | null;
  familyName?: string | null;
  picture?: string | null;
  accountType?: TAccountType | string | null;
  contractorKind?: TContractorKind | string | null;
  nextPath?: string | null;
  signupEntryPath?: string | null;
};

export type ConsumerAuthConsumerSummary = z.infer<typeof consumerAuthConsumerSummarySchema>;
export type ConsumerSignupResponse = z.infer<typeof consumerSignupResponseSchema>;

export type ConsumerForgotPasswordResponse = {
  message: string;
  recoveryMode: string;
};

export type ConsumerSuccessResponse = {
  success: true;
};

export type ConsumerPasswordChangeResponse = ConsumerSuccessResponse & {
  requiresReauth: true;
};

export type ConsumerDocumentsUploadResponse = {
  ids: ConsumerUuid[];
};

export type ConsumerExchangeQuoteResponse = {
  from: TCurrencyCode | string;
  to: TCurrencyCode | string;
  rate: number;
  sourceAmount: number;
  targetAmount: number;
};

export type ConsumerExchangeConversionResponse = {
  ledgerId?: ConsumerUuid;
};

export type ConsumerDeletedExchangeRuleResponse = {
  ruleId: ConsumerUuid;
};

export type ConsumerCancelledScheduledConversionResponse = {
  conversionId: ConsumerUuid;
};

export type ConsumerThemeSettingsResponse = z.infer<typeof consumerThemeSettingsResponseSchema>;
export type ConsumerPreferredCurrencySettingsResponse = z.infer<typeof consumerPreferredCurrencySettingsResponseSchema>;

const consumerIsoDateTimeSchema = z.string();
const consumerDecimalStringSchema = z.string();
const consumerUuidSchema = z.string();
const consumerStringOrNullSchema = z.string().nullable();

const consumerPaginatedOffsetResponseSchema = <TItem extends z.ZodTypeAny>(itemSchema: TItem) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number(),
    page: z.number().optional(),
    pageSize: z.number().optional(),
  });

const consumerPaginatedLimitOffsetResponseSchema = <TItem extends z.ZodTypeAny>(itemSchema: TItem) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number(),
    limit: z.number().optional(),
    offset: z.number().optional(),
  });

const consumerMutationResultSchema = z.object({
  ok: z.literal(true),
  message: z.string().optional(),
});

export const consumerSuccessResponseSchema = z.object({
  success: z.literal(true),
});

export const consumerPasswordChangeResponseSchema = consumerSuccessResponseSchema.extend({
  requiresReauth: z.literal(true),
});

const consumerDashboardSummarySchema = z.object({
  balanceCents: z.number(),
  balanceCurrencyCode: z.string().nullable().optional(),
  availableBalanceCents: z.number(),
  availableBalanceCurrencyCode: z.string().nullable().optional(),
  activeRequests: z.number(),
  lastPaymentAt: consumerIsoDateTimeSchema.nullable(),
});

const consumerDashboardPendingRequestSchema = z.object({
  id: consumerUuidSchema,
  counterpartyName: z.string(),
  amount: z.number(),
  currencyCode: z.string(),
  status: z.string(),
  lastActivityAt: consumerIsoDateTimeSchema.nullable(),
});

const consumerDashboardActivityItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().optional(),
  createdAt: consumerIsoDateTimeSchema,
  kind: z.string(),
});

const consumerDashboardTaskSchema = z.object({
  id: z.string(),
  label: z.string(),
  completed: z.boolean(),
});

const consumerDashboardQuickDocSchema = z.object({
  id: consumerUuidSchema,
  name: z.string(),
  createdAt: consumerIsoDateTimeSchema,
});

const consumerDashboardVerificationSchema = z.object({
  effectiveVerified: z.boolean(),
  profileComplete: z.boolean(),
  status: z.string(),
  canStart: z.boolean(),
  legalVerified: z.boolean(),
  reviewStatus: z.string(),
  stripeStatus: z.string(),
  sessionId: z.string().nullable(),
  lastErrorCode: z.string().nullable(),
  lastErrorReason: z.string().nullable(),
  startedAt: consumerIsoDateTimeSchema.nullable(),
  updatedAt: consumerIsoDateTimeSchema.nullable(),
  verifiedAt: consumerIsoDateTimeSchema.nullable(),
});

export const consumerDashboardDataSchema = z.object({
  summary: consumerDashboardSummarySchema,
  pendingRequests: z.array(consumerDashboardPendingRequestSchema),
  activity: z.array(consumerDashboardActivityItemSchema),
  tasks: z.array(consumerDashboardTaskSchema),
  quickDocs: z.array(consumerDashboardQuickDocSchema),
  verification: consumerDashboardVerificationSchema,
});

const consumerPaymentsListItemSchema = z.object({
  id: consumerUuidSchema,
  amount: z.number(),
  currencyCode: z.string(),
  status: z.string(),
  role: z.string(),
  type: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  createdAt: consumerIsoDateTimeSchema,
  latestTransaction: z
    .object({
      id: consumerUuidSchema,
      status: z.string(),
      createdAt: consumerIsoDateTimeSchema,
    })
    .optional(),
  counterparty: z.object({
    id: consumerUuidSchema,
    email: z.string(),
  }),
});

export type ConsumerPaymentsListItem = z.infer<typeof consumerPaymentsListItemSchema>;

export const consumerPaymentsResponseSchema = consumerPaginatedOffsetResponseSchema(consumerPaymentsListItemSchema);

const consumerPaymentLedgerEntrySchema = z.object({
  id: consumerUuidSchema,
  ledgerId: consumerUuidSchema,
  currencyCode: z.string(),
  amount: z.number(),
  direction: z.string(),
  status: z.string(),
  type: z.string(),
  createdAt: consumerIsoDateTimeSchema,
  rail: z.string().nullable().optional(),
  counterpartyId: z.string().nullable().optional(),
});

const consumerPaymentAttachmentSchema = z.object({
  id: consumerUuidSchema,
  name: z.string(),
  downloadUrl: z.string(),
  size: z.number(),
  createdAt: consumerIsoDateTimeSchema,
});

export const consumerPaymentViewResponseSchema = z.object({
  id: consumerUuidSchema,
  amount: z.number(),
  currencyCode: z.string(),
  status: z.string(),
  description: z.string().nullable().optional(),
  dueDate: consumerIsoDateTimeSchema.nullable().optional(),
  sentDate: consumerIsoDateTimeSchema.nullable().optional(),
  createdAt: consumerIsoDateTimeSchema,
  updatedAt: consumerIsoDateTimeSchema,
  role: z.string(),
  payer: z
    .object({
      id: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
    })
    .nullable(),
  requester: z
    .object({
      id: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
    })
    .nullable(),
  ledgerEntries: z.array(consumerPaymentLedgerEntrySchema),
  attachments: z.array(consumerPaymentAttachmentSchema),
});

const consumerContractsListItemSchema = z.object({
  id: consumerUuidSchema,
  name: z.string(),
  email: z.string(),
  lastRequestId: z.string().nullable(),
  lastStatus: z.string().nullable(),
  lastActivity: consumerIsoDateTimeSchema.nullable(),
  docs: z.number(),
  paymentsCount: z.number(),
  completedPaymentsCount: z.number(),
});

export const consumerContractsResponseSchema = consumerPaginatedOffsetResponseSchema(consumerContractsListItemSchema);

const consumerProfilePersonalDetailsSchema = z
  .object({
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    citizenOf: z.string().nullable().optional(),
    taxId: z.string().nullable().optional(),
    phoneNumber: z.string().nullable().optional(),
  })
  .nullable();

export type ConsumerProfilePersonalDetails = z.infer<typeof consumerProfilePersonalDetailsSchema>;

const consumerProfileAddressDetailsSchema = z
  .object({
    country: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    street: z.string().nullable().optional(),
    postalCode: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
  })
  .nullable();
export type ConsumerProfileAddressDetails = z.infer<typeof consumerProfileAddressDetailsSchema>;

const consumerProfileOrganizationDetailsSchema = z
  .object({
    name: z.string().nullable().optional(),
    size: z.string().nullable().optional(),
    consumerRole: z.string().nullable().optional(),
  })
  .nullable();

export type ConsumerProfileOrganizationDetails = z.infer<typeof consumerProfileOrganizationDetailsSchema>;

export const consumerProfileResponseSchema = z.object({
  id: consumerUuidSchema,
  accountType: z.string(),
  contractorKind: z.string().nullable().optional(),
  howDidHearAboutUs: z.string().nullable().optional(),
  hasPassword: z.boolean().optional(),
  personalDetails: consumerProfilePersonalDetailsSchema.optional(),
  addressDetails: consumerProfileAddressDetailsSchema.optional(),
  organizationDetails: consumerProfileOrganizationDetailsSchema.optional(),
  verification: consumerDashboardVerificationSchema.optional(),
});

export const consumerSettingsResponseSchema = z.object({
  theme: z.string().nullable().optional(),
  preferredCurrency: z.string().nullable().optional(),
});

export const consumerThemeSettingsResponseSchema = z.object({
  theme: z.string().nullable().optional(),
});

export const consumerPreferredCurrencySettingsResponseSchema = z.object({
  preferredCurrency: z.string().nullable().optional(),
});

const consumerDocumentItemSchema = z.object({
  id: consumerUuidSchema,
  name: z.string(),
  size: z.number(),
  createdAt: consumerIsoDateTimeSchema,
  downloadUrl: z.string(),
  mimetype: z.string().nullable(),
  kind: z.string(),
  tags: z.array(z.string()),
  isAttachedToDraftPaymentRequest: z.boolean(),
  attachedDraftPaymentRequestIds: z.array(z.string()),
  isAttachedToNonDraftPaymentRequest: z.boolean(),
  attachedNonDraftPaymentRequestIds: z.array(z.string()),
});

export const consumerDocumentsResponseSchema = consumerPaginatedOffsetResponseSchema(consumerDocumentItemSchema);

const consumerContactAddressResponseSchema = z
  .object({
    street: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    postalCode: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
  })
  .nullable();

export type ConsumerContactAddressResponse = z.infer<typeof consumerContactAddressResponseSchema>;

export const consumerContactResponseSchema = z.object({
  id: consumerUuidSchema,
  name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  address: consumerContactAddressResponseSchema.optional(),
});

export const consumerContactSearchItemSchema = z.object({
  id: consumerUuidSchema,
  name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
});

export const consumerContactSearchResponseSchema = z.array(consumerContactSearchItemSchema);

export const consumerContactsResponseSchema = consumerPaginatedOffsetResponseSchema(consumerContactResponseSchema);

export const consumerContactDetailsResponseSchema = consumerContactResponseSchema.extend({
  paymentRequests: z.array(
    z.object({
      id: consumerUuidSchema,
      amount: consumerDecimalStringSchema,
      status: z.string(),
      createdAt: consumerIsoDateTimeSchema,
    }),
  ),
  documents: z.array(
    z.object({
      id: consumerUuidSchema,
      name: z.string(),
      downloadUrl: z.string(),
      createdAt: consumerIsoDateTimeSchema,
    }),
  ),
});

export const consumerContractDetailsResponseSchema = consumerContactResponseSchema.extend({
  updatedAt: consumerIsoDateTimeSchema,
  summary: z.object({
    lastStatus: z.string().nullable(),
    lastActivity: consumerIsoDateTimeSchema.nullable(),
    lastRequestId: z.string().nullable(),
    documentsCount: z.number(),
    paymentsCount: z.number(),
    completedPaymentsCount: z.number(),
    draftPaymentsCount: z.number(),
    pendingPaymentsCount: z.number(),
    waitingPaymentsCount: z.number(),
  }),
  payments: z.array(
    z.object({
      id: consumerUuidSchema,
      amount: consumerDecimalStringSchema,
      status: z.string(),
      createdAt: consumerIsoDateTimeSchema,
      updatedAt: consumerIsoDateTimeSchema,
      role: z.string(),
      paymentRail: z.string().nullable(),
    }),
  ),
  documents: z.array(
    z.object({
      id: consumerUuidSchema,
      name: z.string(),
      downloadUrl: z.string(),
      createdAt: consumerIsoDateTimeSchema,
      tags: z.array(z.string()),
      isAttachedToDraftPaymentRequest: z.boolean(),
      attachedDraftPaymentRequestIds: z.array(z.string()),
      isAttachedToNonDraftPaymentRequest: z.boolean(),
      attachedNonDraftPaymentRequestIds: z.array(z.string()),
    }),
  ),
});

const consumerBillingDetailsResponseSchema = z.object({
  id: consumerUuidSchema,
  email: consumerStringOrNullSchema,
  name: consumerStringOrNullSchema,
  phone: consumerStringOrNullSchema,
});

export const consumerPaymentMethodItemSchema = z.object({
  id: consumerUuidSchema,
  type: z.string(),
  brand: z.string(),
  last4: z.string(),
  expMonth: z.string().nullable(),
  expYear: z.string().nullable(),
  defaultSelected: z.boolean(),
  reusableForPayerPayments: z.boolean(),
  billingDetails: consumerBillingDetailsResponseSchema.nullable(),
});

export const consumerPaymentMethodsResponseSchema = z.object({
  items: z.array(consumerPaymentMethodItemSchema),
});

export const consumerBalanceResponseSchema = z.record(z.string(), z.number());

const consumerPaymentHistoryItemSchema = z.object({
  id: consumerUuidSchema,
  ledgerId: consumerUuidSchema,
  type: z.string(),
  status: z.string(),
  currencyCode: z.string(),
  amount: z.number(),
  direction: z.string(),
  createdAt: consumerIsoDateTimeSchema,
  rail: z.string().nullable(),
  paymentMethodId: z.string().nullable(),
  paymentMethodLabel: z.string().nullable(),
  paymentRequestId: z.string().nullable(),
});

export const consumerPaymentHistoryResponseSchema = consumerPaginatedLimitOffsetResponseSchema(
  consumerPaymentHistoryItemSchema,
);

const consumerExchangeCurrencySchema = z.object({
  code: z.string(),
  symbol: z.string(),
  name: z.string().optional(),
});

export type ConsumerExchangeCurrency = z.infer<typeof consumerExchangeCurrencySchema>;

export const consumerExchangeCurrenciesResponseSchema = z.array(consumerExchangeCurrencySchema);

export const consumerExchangeRateSchema = z.object({
  from: z.string(),
  to: z.string(),
  rate: z.number(),
});

const consumerExchangeRateCardSchema = z.object({ // eslint-disable-line
  from: z.string(),
  to: z.string(),
  rate: z.number().nullable(),
  status: z.enum([`available`, `stale`, `unavailable`]),
});

export type ConsumerExchangeRateCard = z.infer<typeof consumerExchangeRateCardSchema>;

export const consumerExchangeRatesBatchResponseSchema = z.object({
  data: z.array(
    z.union([
      z.object({
        from: z.string(),
        to: z.string(),
        rate: z.number(),
      }),
      z.object({
        from: z.string(),
        to: z.string(),
        code: z.string(),
      }),
    ]),
  ),
});

export const consumerExchangeQuoteResponseSchema = z.object({
  from: z.string(),
  to: z.string(),
  rate: z.number(),
  sourceAmount: z.number(),
  targetAmount: z.number(),
});

export const consumerExchangeConversionResponseSchema = z.object({
  ledgerId: consumerUuidSchema.optional(),
});

export const consumerExchangeRuleSchema = z.object({
  id: consumerUuidSchema,
  fromCurrency: z.string(),
  toCurrency: z.string(),
  targetBalance: z.number(),
  maxConvertAmount: z.number().nullable(),
  minIntervalMinutes: z.number(),
  enabled: z.boolean(),
});

export const consumerExchangeRulesResponseSchema = consumerPaginatedOffsetResponseSchema(consumerExchangeRuleSchema);

export const consumerScheduledConversionSchema = z.object({
  id: consumerUuidSchema,
  fromCurrency: z.string(),
  toCurrency: z.string(),
  amount: z.number(),
  executeAt: consumerIsoDateTimeSchema,
  status: z.string(),
});

export const consumerScheduledConversionsResponseSchema = consumerPaginatedOffsetResponseSchema(
  consumerScheduledConversionSchema,
);

export const consumerDeletedExchangeRuleResponseSchema = z.object({
  ruleId: consumerUuidSchema,
});

export const consumerCancelledScheduledConversionResponseSchema = z.object({
  conversionId: consumerUuidSchema,
});

export const consumerCreatePaymentRequestResponseSchema = z.object({
  paymentRequestId: consumerUuidSchema.optional(),
});

export const consumerStartPaymentResponseSchema = z.object({
  paymentRequestId: consumerUuidSchema.optional(),
  ledgerId: consumerUuidSchema.optional(),
});

export const consumerTransferResponseSchema = z.object({
  ledgerId: consumerUuidSchema.optional(),
});

export const consumerInvoiceGenerationResponseSchema = z.object({
  invoiceNumber: z.string().optional(),
  resourceId: consumerUuidSchema.optional(),
  downloadUrl: z.string().optional(),
});

export const consumerVerificationSessionResponseSchema = z.object({
  clientSecret: z.string().optional(),
  sessionId: z.string().optional(),
  url: z.string().optional(),
});

export const consumerStripeCheckoutSessionResponseSchema = z.object({
  url: z.string().optional(),
});

export const consumerPayWithSavedMethodResponseSchema = z.object({
  success: z.boolean(),
  paymentIntentId: z.string().optional(),
  status: z.string().optional(),
  nextAction: z.unknown().optional(),
});

export const consumerStripeSetupIntentResponseSchema = z.object({
  clientSecret: z.string(),
});

export const consumerDocumentsUploadResponseSchema = z.object({
  ids: z.array(consumerUuidSchema),
});

export const consumerLoginResponseSchema = z.object({
  ok: z.literal(true),
});

export const consumerAuthLogoutResponseSchema = consumerMutationResultSchema;

export const consumerOAuthCompleteResponseSchema = consumerLoginResponseSchema.extend({
  next: z.string().optional(),
});

export const consumerGoogleSignupSessionResponseSchema = z.object({
  email: z.string(),
  givenName: z.string().nullable().optional(),
  familyName: z.string().nullable().optional(),
  picture: z.string().nullable().optional(),
  accountType: z.string().nullable().optional(),
  contractorKind: z.string().nullable().optional(),
  nextPath: z.string().nullable().optional(),
  signupEntryPath: z.string().nullable().optional(),
});

const consumerAuthConsumerSummarySchema = z.object({
  id: consumerUuidSchema,
  email: z.string(),
  verified: z.boolean().nullable(),
  accountType: z.string(),
  contractorKind: z.string().nullable().optional(),
  howDidHearAboutUs: z.string().nullable().optional(),
});

export const consumerSignupResponseSchema = z.object({
  consumer: consumerAuthConsumerSummarySchema,
  next: z.string().optional(),
});

export const consumerForgotPasswordResponseSchema = z.object({
  message: z.string(),
  recoveryMode: z.string(),
});
