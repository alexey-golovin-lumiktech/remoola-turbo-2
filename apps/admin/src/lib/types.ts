import { type JSX } from 'react';

export type AdminType = `SUPER` | `ADMIN`;

export type AdminUser = {
  id: string;
  type: AdminType;
  email: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type AdminMe = {
  id: string;
  email: string;
  type: AdminType;
};

export type AccountType = `BUSINESS` | `CONTRACTOR`;
export type ContractorKind = `ENTITY` | `INDIVIDUAL`;
export type TransactionStatus =
  | `DRAFT`
  | `WAITING`
  | `WAITING_RECIPIENT_APPROVAL`
  | `PENDING`
  | `COMPLETED`
  | `DENIED`
  | `UNCOLLECTIBLE`;

export type CurrencyCode = string; // keep flexible; you have a big enum

export type Consumer = {
  id: string;
  email: string;
  accountType: AccountType;
  contractorKind?: ContractorKind | null;
  verified?: boolean | null;
  legalVerified?: boolean | null;
  howDidHearAboutUs?: string | null;
  howDidHearAboutUsOther?: string | null;
  stripeCustomerId?: string | null;
  createdAt: string;
  updatedAt: string;

  personalDetails?: PersonalDetails | null;
  organizationDetails?: OrganizationDetails | null;
  addressDetails?: AddressDetails | null;
  googleProfileDetails?: GoogleProfileDetails | null;
};

export type AddressDetails = {
  country: string;
  postalCode: string;
  city?: string | null;
  state?: string | null;
  street?: string | null;
};

export type PersonalDetails = {
  legalStatus?: string | null;
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
  consumerRole?: string | null;
  consumerRoleOther?: string | null;
  size: `SMALL` | `MEDIUM` | `LARGE`;
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
  status: TransactionStatus;
  paymentRail?: string | null;
  type?: string | null; // deprecated, keep nullable
  amount: string; // Decimal
  description?: string | null;

  dueDate?: string | null;
  expectationDate?: string | null;
  sentDate?: string | null;

  payerId: string;
  requesterId: string;

  payer?: Pick<Consumer, `id` | `email`>;
  requester?: Pick<Consumer, `id` | `email`>;

  createdAt: string;
  updatedAt: string;
};

export type LedgerEntry = {
  id: string;
  ledgerId: string;
  type: string;
  currencyCode: CurrencyCode;
  status: TransactionStatus;

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
    list: (filters?: { includeDeleted?: boolean }) => [`api/admins`, filters] as const,
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
} as const;

// Mutation types
export type CreateAdminData = {
  email: string;
  password: string;
  type: AdminType;
};

export type UpdateAdminData = {
  action: `delete` | `restore`;
};

export type ResetPasswordData = {
  password: string;
};
