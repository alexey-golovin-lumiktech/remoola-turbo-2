import 'server-only';

export type {
  ConsumerBalanceResponse as BalanceResponse,
  ConsumerContactDetailsResponse as ContactDetailsResponse,
  ConsumerContactResponse as ContactResponse,
  ConsumerContactSearchItem as ContactSearchItem,
  ConsumerContactsResponse as ContactsResponse,
  ConsumerContractDetailsResponse as ContractDetailsResponse,
  ConsumerContractsResponse as ContractsResponse,
  ConsumerDocumentsResponse as DocumentsResponse,
  ConsumerExchangeCurrency as ExchangeCurrency,
  ConsumerExchangeRate as ExchangeRate,
  ConsumerExchangeRule as ExchangeRule,
  ConsumerPaymentHistoryResponse as PaymentHistoryResponse,
  ConsumerPaymentMethodsResponse as PaymentMethodsResponse,
  ConsumerPaymentsResponse as PaymentsResponse,
  ConsumerPaymentViewResponse as PaymentViewResponse,
  ConsumerProfileResponse as ProfileResponse,
  ConsumerScheduledConversion as ScheduledConversion,
  ConsumerSettingsResponse as SettingsResponse,
} from '@remoola/api-types';

export type {
  DashboardData,
  DashboardDataResult,
  ExchangeRateCard,
  ExchangeRatesBatchResult,
} from './consumer-api.types';

export { getDocuments, getDocumentsResult } from './queries/documents.server';
export {
  getAvailableBalances,
  getAvailableBalancesResult,
  getBalances,
  getPaymentMethods,
} from './queries/banking.server';
export {
  findContactByExactEmail,
  getContact,
  getContactDetails,
  getContacts,
  getContactsResult,
  searchContacts,
  searchContactsResult,
} from './queries/contacts.server';
export { getContractDetails, getContracts, getContractsResult } from './queries/contracts.server';
export { getDashboardData } from './queries/dashboard.server';
export {
  getExchangeCurrencies,
  getExchangeCurrenciesResult,
  getExchangeRatesBatch,
  getExchangeRules,
  getExchangeRulesResult,
  getScheduledConversions,
  getScheduledConversionsResult,
} from './queries/exchange.server';
export { getPaymentHistory, getPayments, getPaymentsResult, getPaymentView } from './queries/payments.server';
export { getProfile, getSettings } from './queries/settings.server';
