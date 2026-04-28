import {
  ACCOUNT_TYPE,
  CONTRACTOR_KIND,
  type TAccountType,
  type TConsumerRole,
  type TContractorKind,
  type THowDidHearAboutUs,
  type TLegalStatus,
  type TOrganizationSize,
} from '../auth';
import { type TCurrencyCode } from '../currency';
import { type TPaymentMethod } from '../payments';
import {
  type ConsumerDateOnly,
  type ConsumerFailedMutationResult,
  type ConsumerIsoDateTime,
  type ConsumerMutationResult,
  type ConsumerUuid,
} from './common';
import { type TTheme } from './theme';

export type ConsumerCreatePaymentRequestPayload = {
  email: string;
  amount: string;
  currencyCode?: TCurrencyCode;
  description?: string;
  dueDate?: ConsumerIsoDateTime | ConsumerDateOnly;
};

export type ConsumerStartPaymentPayload = {
  email: string;
  amount: string;
  currencyCode?: TCurrencyCode;
  description?: string;
  method: TPaymentMethod;
};

export type ConsumerTransferPayload = {
  amount: number;
  currencyCode?: TCurrencyCode;
  currency?: TCurrencyCode;
  recipient?: string;
  recipientId?: string;
  note?: string | null;
};

export type ConsumerWithdrawPayload = {
  amount: number;
  currencyCode?: TCurrencyCode;
  currency?: TCurrencyCode;
  method?: TPaymentMethod;
  paymentMethodId?: ConsumerUuid;
  note?: string;
};

export type ConsumerAttachDocumentsPayload = {
  paymentRequestId: ConsumerUuid;
  resourceIds: ConsumerUuid[];
};

export type ConsumerSetDocumentTagsPayload = {
  tags: string[];
};

export type ConsumerBulkDeleteDocumentsPayload = {
  ids?: ConsumerUuid[];
  documentIds?: ConsumerUuid[];
};

export type ConsumerCreateContactPayload = {
  email: string | null;
  name?: string | null;
  address?: {
    postalCode?: string | null;
    country?: string | null;
    state?: string | null;
    city?: string | null;
    street?: string | null;
  } | null;
};

export type ConsumerUpdateContactPayload = {
  email?: string | null;
  name?: string | null;
  address?: {
    postalCode?: string | null;
    country?: string | null;
    state?: string | null;
    city?: string | null;
    street?: string | null;
  } | null;
};

export type ConsumerCreateAutoConversionRulePayload = {
  fromCurrency: TCurrencyCode;
  toCurrency: TCurrencyCode;
  targetBalance: number;
  maxConvertAmount?: number | null;
  minIntervalMinutes?: number;
  enabled?: boolean;
};

export type ConsumerUpdateAutoConversionRulePayload = Partial<ConsumerCreateAutoConversionRulePayload>;

export type ConsumerScheduleConversionPayload = {
  fromCurrency: TCurrencyCode;
  toCurrency: TCurrencyCode;
  amount: number;
  executeAt: ConsumerIsoDateTime;
};

export type ConsumerConvertCurrencyPayload = {
  from: TCurrencyCode;
  to: TCurrencyCode;
  amount: number;
};

export type ConsumerUpdateProfilePersonalDetailsPayload = {
  firstName?: string | null;
  lastName?: string | null;
  citizenOf?: string | null;
  passportOrIdNumber?: string | null;
  legalStatus?: TLegalStatus | null;
  dateOfBirth?: ConsumerDateOnly | null;
  countryOfTaxResidence?: string | null;
  taxId?: string | null;
  phoneNumber?: string | null;
};

export type ConsumerUpdateProfileAddressDetailsPayload = {
  postalCode?: string | null;
  country?: string | null;
  city?: string | null;
  street?: string | null;
  state?: string | null;
};

export type ConsumerUpdateProfileOrganizationDetailsPayload = {
  name?: string | null;
  size?: TOrganizationSize | string | null;
  consumerRole?: TConsumerRole | string | null;
  consumerRoleOther?: string | null;
};

export type ConsumerUpdateProfilePayload = {
  personalDetails?: ConsumerUpdateProfilePersonalDetailsPayload;
  addressDetails?: ConsumerUpdateProfileAddressDetailsPayload;
  organizationDetails?: ConsumerUpdateProfileOrganizationDetailsPayload;
};

export type ConsumerChangePasswordPayload = {
  currentPassword?: string;
  password: string;
};

export type ConsumerUpdateSettingsPayload = {
  theme?: TTheme;
  preferredCurrency?: TCurrencyCode;
};

export type ConsumerSignupAddressDetailsPayload = {
  postalCode: string;
  country: string;
  state?: string;
  city?: string;
  street?: string;
};

export type ConsumerSignupPersonalDetailsPayload = {
  citizenOf?: string;
  dateOfBirth?: ConsumerDateOnly;
  passportOrIdNumber?: string;
  legalStatus?: TLegalStatus | null;
  countryOfTaxResidence?: string;
  taxId?: string;
  phoneNumber?: string;
  firstName?: string;
  lastName?: string;
};

export type ConsumerSignupOrganizationDetailsPayload = {
  name: string;
  consumerRole: TConsumerRole | string;
  size: TOrganizationSize;
};

export type ConsumerSignupPayload = {
  email: string;
  password?: string;
  accountType: TAccountType;
  contractorKind?: TContractorKind;
  howDidHearAboutUs: THowDidHearAboutUs | null;
  howDidHearAboutUsOther: string | null;
  addressDetails: ConsumerSignupAddressDetailsPayload;
  organizationDetails?: ConsumerSignupOrganizationDetailsPayload;
  personalDetails?: ConsumerSignupPersonalDetailsPayload;
};

export function consumerSignupRequiresOrganizationDetails(
  accountType: TAccountType,
  contractorKind?: TContractorKind | null,
): boolean {
  return (
    accountType === ACCOUNT_TYPE.BUSINESS ||
    (accountType === ACCOUNT_TYPE.CONTRACTOR && contractorKind === CONTRACTOR_KIND.ENTITY)
  );
}

export function consumerSignupRequiresPersonalDetails(
  accountType: TAccountType,
  contractorKind?: TContractorKind | null,
): boolean {
  return accountType === ACCOUNT_TYPE.CONTRACTOR && contractorKind === CONTRACTOR_KIND.INDIVIDUAL;
}

export type ConsumerForgotPasswordBody = {
  email: string;
};

export type ConsumerLoginBody = {
  email: string;
  password: string;
};

export type ConsumerResetPasswordBody = {
  token: string;
  password: string;
};

export type ConsumerHandoffTokenRequest = {
  handoffToken: string;
};

export type ConsumerPayWithSavedPaymentMethodPayload = {
  paymentMethodId: ConsumerUuid;
};

export type ConsumerConfirmStripeSetupIntentPayload = {
  setupIntentId: string;
};

export type ConsumerSucceededMutationResult<TData> = {
  ok: true;
  data: TData;
  message?: string;
};

export type ConsumerApiMutationResult<TData> = ConsumerSucceededMutationResult<TData> | ConsumerFailedMutationResult;
export type ConsumerSimpleMutationResult = ConsumerMutationResult | ConsumerFailedMutationResult;
