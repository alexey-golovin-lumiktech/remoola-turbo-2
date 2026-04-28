import { type TAccountType, type TContractorKind, type THowDidHearAboutUs, type TVerificationStatus } from '../auth';
import { type TCurrencyCode } from '../currency';
import { type TPaymentMethod } from '../payments';
import {
  type ConsumerDecimalString,
  type ConsumerIsoDateTime,
  type ConsumerMutationResult,
  type ConsumerPaginatedLimitOffsetResponse,
  type ConsumerPaginatedOffsetResponse,
  type ConsumerUuid,
} from './common';
import { type TTheme } from './theme';

export type ConsumerDashboardSummary = {
  balanceCents: number;
  balanceCurrencyCode?: TCurrencyCode | null;
  availableBalanceCents: number;
  availableBalanceCurrencyCode?: TCurrencyCode | null;
  activeRequests: number;
  lastPaymentAt: ConsumerIsoDateTime | null;
};

export type ConsumerDashboardPendingRequest = {
  id: ConsumerUuid;
  counterpartyName: string;
  amount: number;
  currencyCode: TCurrencyCode | string;
  status: string;
  lastActivityAt: ConsumerIsoDateTime | null;
};

export type ConsumerDashboardActivityItem = {
  id: string;
  label: string;
  description?: string;
  createdAt: ConsumerIsoDateTime;
  kind: string;
};

export type ConsumerDashboardTask = {
  id: string;
  label: string;
  completed: boolean;
};

export type ConsumerDashboardQuickDoc = {
  id: ConsumerUuid;
  name: string;
  createdAt: ConsumerIsoDateTime;
};

export type ConsumerDashboardVerification = {
  effectiveVerified: boolean;
  profileComplete: boolean;
  status: TVerificationStatus | string;
  canStart: boolean;
  legalVerified: boolean;
  reviewStatus: string;
  stripeStatus: string;
  sessionId: string | null;
  lastErrorCode: string | null;
  lastErrorReason: string | null;
  startedAt: ConsumerIsoDateTime | null;
  updatedAt: ConsumerIsoDateTime | null;
  verifiedAt: ConsumerIsoDateTime | null;
};

export type ConsumerDashboardData = {
  summary: ConsumerDashboardSummary;
  pendingRequests: ConsumerDashboardPendingRequest[];
  activity: ConsumerDashboardActivityItem[];
  tasks: ConsumerDashboardTask[];
  quickDocs: ConsumerDashboardQuickDoc[];
  verification: ConsumerDashboardVerification;
};

export type ConsumerDashboardDataResult = {
  data: ConsumerDashboardData | null;
  unavailable: boolean;
};

export type ConsumerPaymentsListItem = {
  id: ConsumerUuid;
  amount: number;
  currencyCode: TCurrencyCode | string;
  status: string;
  role: string;
  type?: string | null;
  description?: string | null;
  createdAt: ConsumerIsoDateTime;
  latestTransaction?: {
    id: ConsumerUuid;
    status: string;
    createdAt: ConsumerIsoDateTime;
  };
  counterparty: {
    id: ConsumerUuid;
    email: string;
  };
};

export type ConsumerPaymentsResponse = ConsumerPaginatedOffsetResponse<ConsumerPaymentsListItem>;

export type ConsumerPaymentLedgerEntry = {
  id: ConsumerUuid;
  ledgerId: ConsumerUuid;
  currencyCode: TCurrencyCode | string;
  amount: number;
  direction: string;
  status: string;
  type: string;
  createdAt: ConsumerIsoDateTime;
  rail?: string | null;
  counterpartyId?: string | null;
};

export type ConsumerPaymentAttachment = {
  id: ConsumerUuid;
  name: string;
  downloadUrl: string;
  size: number;
  createdAt: ConsumerIsoDateTime;
};

export type ConsumerPaymentViewResponse = {
  id: ConsumerUuid;
  amount: number;
  currencyCode: TCurrencyCode | string;
  status: string;
  description?: string | null;
  dueDate?: ConsumerIsoDateTime | null;
  sentDate?: ConsumerIsoDateTime | null;
  createdAt: ConsumerIsoDateTime;
  updatedAt: ConsumerIsoDateTime;
  role: string;
  payer: {
    id?: string | null;
    email?: string | null;
  } | null;
  requester: {
    id?: string | null;
    email?: string | null;
  } | null;
  ledgerEntries: ConsumerPaymentLedgerEntry[];
  attachments: ConsumerPaymentAttachment[];
};

export type ConsumerContractsListItem = {
  id: ConsumerUuid;
  name: string;
  email: string;
  lastRequestId: string | null;
  lastStatus: string | null;
  lastActivity: ConsumerIsoDateTime | null;
  docs: number;
  paymentsCount: number;
  completedPaymentsCount: number;
};

export type ConsumerContractsResponse = ConsumerPaginatedOffsetResponse<ConsumerContractsListItem>;

export type ConsumerProfilePersonalDetails = {
  firstName?: string | null;
  lastName?: string | null;
  citizenOf?: string | null;
  taxId?: string | null;
  phoneNumber?: string | null;
} | null;

export type ConsumerProfileAddressDetails = {
  country?: string | null;
  city?: string | null;
  street?: string | null;
  postalCode?: string | null;
  state?: string | null;
} | null;

export type ConsumerProfileOrganizationDetails = {
  name?: string | null;
  size?: string | null;
  consumerRole?: string | null;
} | null;

export type ConsumerProfileResponse = {
  id: ConsumerUuid;
  accountType: TAccountType | string;
  contractorKind?: TContractorKind | null;
  howDidHearAboutUs?: THowDidHearAboutUs | null;
  hasPassword?: boolean;
  personalDetails?: ConsumerProfilePersonalDetails;
  addressDetails?: ConsumerProfileAddressDetails;
  organizationDetails?: ConsumerProfileOrganizationDetails;
  verification?: ConsumerDashboardVerification;
};

export type ConsumerSettingsResponse = {
  theme?: TTheme | null;
  preferredCurrency?: TCurrencyCode | null;
};

export type ConsumerDocumentItem = {
  id: ConsumerUuid;
  name: string;
  size: number;
  createdAt: ConsumerIsoDateTime;
  downloadUrl: string;
  mimetype: string | null;
  kind: string;
  tags: string[];
  isAttachedToDraftPaymentRequest: boolean;
  attachedDraftPaymentRequestIds: string[];
  isAttachedToNonDraftPaymentRequest: boolean;
  attachedNonDraftPaymentRequestIds: string[];
};

export type ConsumerDocumentsResponse = ConsumerPaginatedOffsetResponse<ConsumerDocumentItem>;

export type ConsumerContactAddressResponse = {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
} | null;

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
    url: string;
    createdAt: ConsumerIsoDateTime;
  }>;
};

export type ConsumerContractDetailsResponse = ConsumerContactResponse & {
  updatedAt: ConsumerIsoDateTime;
  summary: {
    lastStatus: string | null;
    lastActivity: ConsumerIsoDateTime | null;
    lastRequestId: string | null;
    documentsCount: number;
    paymentsCount: number;
    completedPaymentsCount: number;
    draftPaymentsCount: number;
    pendingPaymentsCount: number;
    waitingPaymentsCount: number;
  };
  payments: Array<{
    id: ConsumerUuid;
    amount: ConsumerDecimalString;
    status: string;
    createdAt: ConsumerIsoDateTime;
    updatedAt: ConsumerIsoDateTime;
    role: string;
    paymentRail: string | null;
  }>;
  documents: Array<{
    id: ConsumerUuid;
    name: string;
    downloadUrl: string;
    createdAt: ConsumerIsoDateTime;
    tags: string[];
    isAttachedToDraftPaymentRequest: boolean;
    attachedDraftPaymentRequestIds: string[];
    isAttachedToNonDraftPaymentRequest: boolean;
    attachedNonDraftPaymentRequestIds: string[];
  }>;
};

export type ConsumerBillingDetailsResponse = {
  id: ConsumerUuid;
  email: string | null;
  name: string | null;
  phone: string | null;
};

export type ConsumerPaymentMethodItem = {
  id: ConsumerUuid;
  type: TPaymentMethod | string;
  brand: string;
  last4: string;
  expMonth: string | null;
  expYear: string | null;
  defaultSelected: boolean;
  reusableForPayerPayments: boolean;
  billingDetails: ConsumerBillingDetailsResponse | null;
};

export type ConsumerPaymentMethodsResponse = {
  items: ConsumerPaymentMethodItem[];
};

export type ConsumerBalanceResponse = Record<string, number>;

export type ConsumerPaymentHistoryItem = {
  id: ConsumerUuid;
  ledgerId: ConsumerUuid;
  type: string;
  status: string;
  currencyCode: TCurrencyCode | string;
  amount: number;
  direction: string;
  createdAt: ConsumerIsoDateTime;
  rail: string | null;
  paymentMethodId: string | null;
  paymentMethodLabel: string | null;
  paymentRequestId: string | null;
};

export type ConsumerPaymentHistoryResponse = ConsumerPaginatedLimitOffsetResponse<ConsumerPaymentHistoryItem>;

export type ConsumerExchangeCurrency = {
  code: TCurrencyCode | string;
  symbol: string;
  name?: string;
};

export type ConsumerExchangeRate = {
  from: TCurrencyCode | string;
  to: TCurrencyCode | string;
  rate: number;
};

export type ConsumerExchangeRateCard = {
  from: TCurrencyCode | string;
  to: TCurrencyCode | string;
  rate: number | null;
  status: `available` | `stale` | `unavailable`;
};

export type ConsumerExchangeRatesBatchResult = {
  items: ConsumerExchangeRateCard[];
  unavailable: boolean;
};

export type ConsumerExchangeRule = {
  id: ConsumerUuid;
  fromCurrency: TCurrencyCode | string;
  toCurrency: TCurrencyCode | string;
  targetBalance: number;
  maxConvertAmount: number | null;
  minIntervalMinutes: number;
  enabled: boolean;
};

export type ConsumerExchangeRulesResponse = ConsumerPaginatedOffsetResponse<ConsumerExchangeRule>;

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

export type ConsumerAuthConsumerSummary = {
  id: ConsumerUuid;
  email: string;
  verified: boolean | null;
  accountType: TAccountType | string;
  contractorKind?: TContractorKind | null;
  howDidHearAboutUs?: THowDidHearAboutUs | null;
};

export type ConsumerSignupResponse = {
  consumer: ConsumerAuthConsumerSummary;
  next?: string;
};

export type ConsumerForgotPasswordResponse = {
  message: string;
  recoveryMode: string;
};
