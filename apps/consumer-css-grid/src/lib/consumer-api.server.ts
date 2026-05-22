import 'server-only';

export type {
  BalanceResponse,
  ContactDetailsResponse,
  ContactResponse,
  ContactsResponse,
  ContactSearchItem,
  ContractDetailsResponse,
  ContractsResponse,
  DashboardData,
  DashboardDataResult,
  DocumentsResponse,
  ExchangeCurrency,
  ExchangeRate,
  ExchangeRateCard,
  ExchangeRatesBatchResult,
  ExchangeRule,
  PaymentHistoryResponse,
  PaymentMethodsResponse,
  PaymentsResponse,
  PaymentViewResponse,
  ProfileResponse,
  ScheduledConversion,
  SettingsResponse,
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
