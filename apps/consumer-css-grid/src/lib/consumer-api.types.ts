import {
  type ConsumerBalanceResponse,
  type ConsumerContactDetailsResponse,
  type ConsumerContactResponse,
  type ConsumerContactSearchItem,
  type ConsumerContactsResponse,
  type ConsumerContractDetailsResponse,
  type ConsumerContractsResponse,
  type ConsumerDashboardData,
  type ConsumerDashboardDataResult,
  type ConsumerDocumentsResponse,
  type ConsumerExchangeCurrency,
  type ConsumerExchangeRate,
  type ConsumerExchangeRateCard,
  type ConsumerExchangeRatesBatchResult,
  type ConsumerExchangeRule,
  type ConsumerPaymentHistoryResponse,
  type ConsumerPaymentMethodsResponse,
  type ConsumerPaymentsResponse,
  type ConsumerPaymentViewResponse,
  type ConsumerProfileResponse,
  type ConsumerScheduledConversion,
  type ConsumerSettingsResponse,
} from '@remoola/api-types';

export type DashboardData = ConsumerDashboardData & {
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
};
export type DashboardDataResult = Omit<ConsumerDashboardDataResult, `data`> & {
  data: DashboardData | null;
};
export type PaymentsResponse = ConsumerPaymentsResponse;
export type PaymentViewResponse = ConsumerPaymentViewResponse;
export type ContractsResponse = ConsumerContractsResponse;
export type ProfileResponse = ConsumerProfileResponse;
export type SettingsResponse = ConsumerSettingsResponse;
export type DocumentsResponse = ConsumerDocumentsResponse;
export type ContactsResponse = ConsumerContactsResponse;
export type ContactResponse = ConsumerContactResponse;
export type ContactSearchItem = ConsumerContactSearchItem;
export type ContactDetailsResponse = ConsumerContactDetailsResponse;
export type ContractDetailsResponse = ConsumerContractDetailsResponse;
export type PaymentMethodsResponse = ConsumerPaymentMethodsResponse;
export type BalanceResponse = ConsumerBalanceResponse;
export type PaymentHistoryResponse = ConsumerPaymentHistoryResponse;
export type ExchangeCurrency = ConsumerExchangeCurrency;
export type ExchangeRate = ConsumerExchangeRate;
export type ExchangeRateCard = ConsumerExchangeRateCard;
export type ExchangeRatesBatchResult = ConsumerExchangeRatesBatchResult;
export type ExchangeRule = ConsumerExchangeRule;
export type ScheduledConversion = ConsumerScheduledConversion;
