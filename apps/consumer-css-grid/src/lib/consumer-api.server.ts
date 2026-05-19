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

export { getDocuments } from './queries/documents.server';
export { getAvailableBalances, getBalances, getPaymentMethods } from './queries/banking.server';
export {
  findContactByExactEmail,
  getContact,
  getContactDetails,
  getContacts,
  searchContacts,
} from './queries/contacts.server';
export { getContractDetails, getContracts } from './queries/contracts.server';
export { getDashboardData } from './queries/dashboard.server';
export {
  getExchangeCurrencies,
  getExchangeRatesBatch,
  getExchangeRules,
  getScheduledConversions,
} from './queries/exchange.server';
export { getPaymentHistory, getPayments, getPaymentView } from './queries/payments.server';
export { getProfile, getSettings } from './queries/settings.server';
