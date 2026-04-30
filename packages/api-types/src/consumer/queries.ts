import { type ConsumerAppScope } from '../http';
import { type TAccountType, type TContractorKind } from '../auth';
import { type TCurrencyCode } from '../currency';
import { type TPaymentDirection } from '../payments';
import { type ConsumerPageQuery, type ConsumerOffsetQuery } from './common';

export type ConsumerPaymentsListQuery = ConsumerPageQuery & {
  status?: string;
  type?: string;
  role?: string;
  search?: string;
};

export type ConsumerPaymentHistoryQuery = ConsumerOffsetQuery & {
  direction?: TPaymentDirection;
  status?: string;
  type?: string;
};

export type ConsumerContractsListQuery = ConsumerPageQuery & {
  query?: string;
  status?: string;
  hasDocuments?: string;
  hasPayments?: string;
  sort?: string;
};

export type ConsumerContactsListQuery = ConsumerPageQuery & {
  query?: string;
  limit?: number;
};

export type ConsumerDocumentsListQuery = ConsumerPageQuery & {
  kind?: string;
  contactId?: string;
};

export type ConsumerExchangeRateQuery = {
  from: TCurrencyCode;
  to: TCurrencyCode;
};

export type ConsumerExchangeRatesBatchQuery = {
  pairs: Array<{
    from: TCurrencyCode;
    to: TCurrencyCode;
  }>;
};

export type ConsumerGoogleOAuthStartQuery = {
  appScope?: ConsumerAppScope;
  next?: string;
  signupPath?: string;
  accountType?: TAccountType;
  contractorKind?: TContractorKind;
};

export type ConsumerAppScopeQuery = {
  appScope?: ConsumerAppScope;
};

export type ConsumerStripeCheckoutQuery = ConsumerAppScopeQuery & {
  contractId?: string;
  returnTo?: string;
};
