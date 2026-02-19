import { type JSX } from 'react';

import {
  type TAccountType,
  type TAdminType,
  type TConsumerRole,
  type TContractorKind,
  type TLegalStatus,
  type TLedgerEntryType,
  type TOrganizationSize,
  type TScheduledFxConversionStatus,
  type TTransactionStatus,
  type TVerificationStatus,
} from '@remoola/api-types';

/** Re-export for backward compatibility; use TAdminType from @remoola/api-types in new code. */
export type AdminType = TAdminType;

export type AdminDetails = {
  id: string;
  type: TAdminType;
  email: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type AdminMe = {
  id: string;
  email: string;
  type: TAdminType;
};

export type CurrencyCode = string; // keep flexible; you have a big enum

export type ConsumerResource = {
  id: string;
  resource: {
    id: string;
    originalName: string;
    downloadUrl: string;
    createdAt: string;
  };
};

export type Consumer = {
  id: string;
  email: string;
  accountType: TAccountType;
  contractorKind?: TContractorKind | null;
  verified?: boolean | null;
  legalVerified?: boolean | null;
  verificationStatus?: TVerificationStatus | null;
  verificationReason?: string | null;
  verificationUpdatedAt?: string | null;
  verificationUpdatedBy?: string | null;
  howDidHearAboutUs?: string | null;
  howDidHearAboutUsOther?: string | null;
  stripeCustomerId?: string | null;
  createdAt: string;
  updatedAt: string;

  personalDetails?: PersonalDetails | null;
  organizationDetails?: OrganizationDetails | null;
  addressDetails?: AddressDetails | null;
  googleProfileDetails?: GoogleProfileDetails | null;
  consumerResources?: ConsumerResource[];
};

export type AddressDetails = {
  country: string;
  postalCode: string;
  city?: string | null;
  state?: string | null;
  street?: string | null;
};

export type PersonalDetails = {
  legalStatus?: TLegalStatus | null;
  citizenOf: string;
  dateOfBirth: string;
  passportOrIdNumber: string;
  countryOfTaxResidence?: string | null;
  taxId?: string | null;
  phoneNumber?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

export type OrganizationDetails = {
  name: string;
  consumerRole?: TConsumerRole | null;
  consumerRoleOther?: string | null;
  size?: TOrganizationSize | null;
};

export type GoogleProfileDetails = {
  email: string;
  emailVerified: boolean;
  name?: string | null;
  givenName?: string | null;
  familyName?: string | null;
  picture?: string | null;
  organization?: string | null;
  metadata?: unknown;
};

export type PaymentRequest = {
  id: string;
  currencyCode: CurrencyCode;
  status: TTransactionStatus;
  paymentRail?: string | null;
  type?: string | null; // deprecated, keep nullable
  amount: string; // Decimal
  description?: string | null;

  dueDate?: string | null;
  sentDate?: string | null;

  /** Null when payer is email-only (not yet claimed). Matches DB payment_request.payer_id. */
  payerId?: string | null;
  payerEmail?: string | null;
  requesterId: string;

  payer?: Pick<Consumer, `id` | `email`>;
  requester?: Pick<Consumer, `id` | `email`>;

  createdAt: string;
  updatedAt: string;
};

/** Response shape for GET /api/payment-requests and GET /api/ledger (paginated). */
export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type LedgerEntry = {
  id: string;
  ledgerId: string;
  type: TLedgerEntryType;
  currencyCode: CurrencyCode;
  status: TTransactionStatus;

  amount: string; // Decimal signed
  feesType?: string | null;
  feesAmount?: string | null;

  stripeId?: string | null;
  idempotencyKey?: string | null;
  metadata?: unknown;

  consumerId: string;
  paymentRequestId?: string | null;

  createdAt: string;
  updatedAt: string;
};

export type PaymentRequestExpectationDateArchive = {
  id: string;
  paymentRequestId: string;
  expectationDate: string;
  archivedAt: string;
  migrationTag: string;
  paymentRequestExists: boolean;
};

/** Re-export for backward compatibility; use TScheduledFxConversionStatus from @remoola/api-types in new code. */
export type ScheduledFxConversionStatus = TScheduledFxConversionStatus;

export type AutoConversionRule = {
  id: string;
  consumerId: string;
  consumer?: Pick<Consumer, `id` | `email`>;
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  targetBalance: number;
  maxConvertAmount?: number | null;
  minIntervalMinutes: number;
  enabled: boolean;
  nextRunAt?: string | null;
  lastRunAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ScheduledFxConversion = {
  id: string;
  consumerId: string;
  consumer?: Pick<Consumer, `id` | `email`>;
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  amount: number;
  status: ScheduledFxConversionStatus;
  executeAt: string;
  attempts: number;
  lastError?: string | null;
  ledgerId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ExchangeRate = {
  id: string;
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  rate: number;
  rateBid?: number | null;
  rateAsk?: number | null;
  spreadBps?: number | null;
  status?: `DRAFT` | `APPROVED` | `DISABLED`;
  effectiveAt?: string;
  expiresAt?: string | null;
  fetchedAt?: string | null;
  provider?: string | null;
  providerRateId?: string | null;
  confidence?: number | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type PageProps = { params: JSX.IntrinsicAttributes | PromiseLike<JSX.IntrinsicAttributes> };

export type RouteHandlerContext<T extends Record<string, string>> = {
  params: Promise<T>;
};

// Enhanced API types are defined in api.ts

// Query keys for consistent caching
export const queryKeys = {
  auth: {
    me: () => [`api/auth/me`] as const,
  },
  admins: {
    list: (filters?: { includeDeleted?: boolean; q?: string; type?: string; page?: number; pageSize?: number }) =>
      [`api/admins`, filters] as const,
    detail: (id: string) => [`api/admins/${id}`] as const,
  },
  consumers: {
    list: () => [`api/consumers`] as const,
    detail: (id: string) => [`api/consumers/${id}`] as const,
  },
  paymentRequests: {
    list: () => [`api/payment-requests`] as const,
    detail: (id: string) => [`api/payment-requests/${id}`] as const,
  },
  ledger: {
    entries: () => [`api/ledger`] as const,
  },
  dashboard: {
    stats: () => [`api/dashboard/stats`] as const,
    paymentRequestsByStatus: () => [`api/dashboard/payment-requests-by-status`] as const,
    recentPaymentRequests: () => [`api/dashboard/recent-payment-requests`] as const,
    ledgerAnomalies: () => [`api/dashboard/ledger-anomalies`] as const,
    verificationQueue: () => [`api/dashboard/verification-queue`] as const,
  },
} as const;

// Dashboard types
export type DashboardStats = {
  consumers: {
    total: number;
    verified: number;
    unverified: number;
  };
  paymentRequests: {
    total: number;
    byStatus: Record<TTransactionStatus, number>;
  };
  ledger: {
    total: number;
    anomalies: number;
  };
};

export type PaymentRequestsByStatus = {
  status: TTransactionStatus;
  count: number;
  totalAmount: string;
}[];

export type RecentPaymentRequest = PaymentRequest & {
  payer?: Pick<Consumer, `id` | `email`>;
  requester?: Pick<Consumer, `id` | `email`>;
};

export type LedgerAnomaly = {
  id: string;
  type:
    | `duplicate`
    | `missing_ledger_entry`
    | `dangling_ledger_entry`
    | `unlinked_payment_ledger_entry`
    | `amount_mismatch`
    | `status_inconsistency`
    | `premature_ledger_entry`;
  description: string;
  paymentRequestId?: string;
  consumerId: string;
  createdAt: string;
};

export type VerificationQueueItem = Consumer & {
  personalDetails?: PersonalDetails;
  organizationDetails?: OrganizationDetails;
  documentsCount: number;
};
