import { type TTheme } from '@remoola/api-types';

export interface DashboardData {
  summary: {
    balanceCents: number;
    balanceCurrencyCode?: string | null;
    availableBalanceCents: number;
    availableBalanceCurrencyCode?: string | null;
    activeRequests: number;
    lastPaymentAt: string | null;
  };
  pendingRequests: Array<{
    id: string;
    counterpartyName: string;
    amount: number;
    currencyCode: string;
    status: string;
    lastActivityAt: string | null;
  }>;
  activity: Array<{
    id: string;
    label: string;
    description?: string;
    createdAt: string;
    kind: string;
  }>;
  tasks: Array<{
    id: string;
    label: string;
    completed: boolean;
  }>;
  quickDocs: Array<{
    id: string;
    name: string;
    createdAt: string;
  }>;
  pendingWithdrawals?: {
    items: Array<{
      id: string;
      ledgerId: string;
      paymentRequestId: string | null;
      amount: number;
      currencyCode: string;
      status: string;
      createdAt: string;
      paymentMethodLabel: string | null;
    }>;
    total: number;
  };
  verification: {
    effectiveVerified: boolean;
    profileComplete: boolean;
    status: string;
    canStart: boolean;
    legalVerified: boolean;
    reviewStatus: string;
    stripeStatus: string;
    sessionId: string | null;
    lastErrorCode: string | null;
    lastErrorReason: string | null;
    startedAt: string | null;
    updatedAt: string | null;
    verifiedAt: string | null;
  };
}

export interface DashboardDataResult {
  data: DashboardData | null;
  unavailable: boolean;
}

export interface PaymentsResponse {
  items: Array<{
    id: string;
    amount: number;
    currencyCode: string;
    status: string;
    role: string;
    type?: string | null;
    description?: string | null;
    createdAt: string;
    latestTransaction?: {
      id: string;
      status: string;
      createdAt: string;
    };
    counterparty: {
      id: string;
      email: string;
    };
  }>;
  total: number;
  page?: number;
  pageSize?: number;
}

export interface PaymentViewResponse {
  id: string;
  amount: number;
  currencyCode: string;
  status: string;
  description?: string | null;
  dueDate?: string | null;
  sentDate?: string | null;
  createdAt: string;
  updatedAt: string;
  role: string;
  payer: {
    id?: string | null;
    email?: string | null;
  } | null;
  requester: {
    id?: string | null;
    email?: string | null;
  } | null;
  ledgerEntries: Array<{
    id: string;
    ledgerId: string;
    currencyCode: string;
    amount: number;
    direction: string;
    status: string;
    type: string;
    createdAt: string;
    rail?: string | null;
    counterpartyId?: string | null;
  }>;
  attachments: Array<{
    id: string;
    name: string;
    downloadUrl: string;
    size: number;
    createdAt: string;
  }>;
}

export interface ContractsResponse {
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
  page?: number;
  pageSize?: number;
}

export interface ProfileResponse {
  id: string;
  accountType: string;
  hasPassword?: boolean;
  personalDetails?: {
    firstName?: string | null;
    lastName?: string | null;
    citizenOf?: string | null;
    taxId?: string | null;
    phoneNumber?: string | null;
  } | null;
  addressDetails?: {
    country?: string | null;
    city?: string | null;
    street?: string | null;
    postalCode?: string | null;
  } | null;
  organizationDetails?: {
    name?: string | null;
    size?: string | null;
    consumerRole?: string | null;
  } | null;
  verification?: {
    effectiveVerified: boolean;
    profileComplete: boolean;
    status: string;
    canStart: boolean;
    legalVerified: boolean;
    reviewStatus: string;
    stripeStatus: string;
    sessionId: string | null;
    lastErrorCode: string | null;
    lastErrorReason: string | null;
    startedAt: string | null;
    updatedAt: string | null;
    verifiedAt: string | null;
  };
}

export interface SettingsResponse {
  theme?: TTheme | null;
  preferredCurrency?: string | null;
}

export interface DocumentsResponse {
  items: Array<{
    id: string;
    name: string;
    size: number;
    createdAt: string;
    downloadUrl: string;
    mimetype: string | null;
    kind: string;
    tags: string[];
    isAttachedToDraftPaymentRequest: boolean;
    attachedDraftPaymentRequestIds: string[];
    isAttachedToNonDraftPaymentRequest: boolean;
    attachedNonDraftPaymentRequestIds: string[];
  }>;
  total: number;
  page?: number;
  pageSize?: number;
}

export interface ContactsResponse {
  items: Array<{
    id: string;
    name?: string | null;
    email?: string | null;
    address?: {
      street?: string | null;
      city?: string | null;
      state?: string | null;
      postalCode?: string | null;
      country?: string | null;
    } | null;
  }>;
  total: number;
  page?: number;
  pageSize?: number;
}

export interface ContactResponse {
  id: string;
  name?: string | null;
  email?: string | null;
  address?: {
    street?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
  } | null;
}

export interface ContactSearchItem {
  id: string;
  name?: string | null;
  email?: string | null;
}

export interface ContactDetailsResponse extends ContactResponse {
  paymentRequests: Array<{
    id: string;
    amount: string;
    status: string;
    createdAt: string;
  }>;
  documents: Array<{
    id: string;
    name: string;
    url: string;
    createdAt: string;
  }>;
}

export interface ContractDetailsResponse extends ContactResponse {
  updatedAt: string;
  summary: {
    lastStatus: string | null;
    lastActivity: string | null;
    lastRequestId: string | null;
    documentsCount: number;
    paymentsCount: number;
    completedPaymentsCount: number;
    draftPaymentsCount: number;
    pendingPaymentsCount: number;
    waitingPaymentsCount: number;
  };
  payments: Array<{
    id: string;
    amount: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    role: string;
    paymentRail: string | null;
  }>;
  documents: Array<{
    id: string;
    name: string;
    downloadUrl: string;
    createdAt: string;
    tags: string[];
    isAttachedToDraftPaymentRequest: boolean;
    attachedDraftPaymentRequestIds: string[];
    isAttachedToNonDraftPaymentRequest: boolean;
    attachedNonDraftPaymentRequestIds: string[];
  }>;
}

export interface PaymentMethodsResponse {
  items: Array<{
    id: string;
    type: string;
    brand: string;
    last4: string;
    expMonth: string | null;
    expYear: string | null;
    defaultSelected: boolean;
    reusableForPayerPayments: boolean;
    billingDetails: {
      id: string;
      email: string | null;
      name: string | null;
      phone: string | null;
    } | null;
  }>;
}

export type BalanceResponse = Record<string, number>;

export interface PaymentHistoryResponse {
  items: Array<{
    id: string;
    ledgerId: string;
    type: string;
    status: string;
    currencyCode: string;
    amount: number;
    direction: string;
    createdAt: string;
    rail: string | null;
    paymentMethodId: string | null;
    paymentMethodLabel: string | null;
    paymentRequestId: string | null;
  }>;
  total: number;
  limit?: number;
  offset?: number;
}

export interface ExchangeCurrency {
  code: string;
  symbol: string;
  name?: string;
}

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
}

export interface ExchangeRateCard {
  from: string;
  to: string;
  rate: number | null;
  status: `available` | `stale` | `unavailable`;
}

export interface ExchangeRatesBatchResult {
  items: ExchangeRateCard[];
  unavailable: boolean;
}

export interface ExchangeRule {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  targetBalance: number;
  maxConvertAmount: number | null;
  minIntervalMinutes: number;
  enabled: boolean;
}

export interface ScheduledConversion {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  executeAt: string;
  status: string;
}
