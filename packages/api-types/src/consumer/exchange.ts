import {
  type ConsumerConvertCurrencyPayload,
  type ConsumerCreateAutoConversionRulePayload,
  type ConsumerScheduleConversionPayload,
  type ConsumerUpdateAutoConversionRulePayload,
} from './mutations';
import {
  type ConsumerExchangeCurrency as ConsumerExchangeCurrencyResponse,
  type ConsumerExchangeRate as ConsumerExchangeRateResponse,
  type ConsumerExchangeRateCard as ConsumerExchangeRateCardResponse,
  type ConsumerExchangeRatesBatchResult as ConsumerExchangeRatesBatchResultResponse,
  type ConsumerExchangeRule as ConsumerExchangeRuleResponse,
  type ConsumerScheduledConversion as ConsumerScheduledConversionResponse,
} from './responses';

/** Single-currency balance (e.g. from GET /consumer/payments/balance normalized to array item). */
export interface IConsumerExchangeBalance {
  currency: string;
  amountCents: number;
  symbol: string;
}

/** Exchange quote response (POST /consumer/exchange/quote). */
export interface IConsumerExchangeQuote {
  from: string;
  to: string;
  rate: number;
  amountFrom: number;
  amountTo: number;
  timestamp: string;
  expiresAt?: string;
}

/** Exchange conversion result (POST /consumer/exchange/convert). */
export interface IConsumerExchangeConversion {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  amountFrom: number;
  amountTo: number;
  rate: number;
  status: string;
  createdAt: string;
}

export type ConsumerExchangeCurrency = ConsumerExchangeCurrencyResponse;
export type ConsumerExchangeRate = ConsumerExchangeRateResponse;
export type ConsumerExchangeRateCard = ConsumerExchangeRateCardResponse;
export type ConsumerExchangeRatesBatchResult = ConsumerExchangeRatesBatchResultResponse;
export type ConsumerExchangeRule = ConsumerExchangeRuleResponse;
export type ConsumerScheduledConversion = ConsumerScheduledConversionResponse;
export type {
  ConsumerConvertCurrencyPayload,
  ConsumerCreateAutoConversionRulePayload,
  ConsumerScheduleConversionPayload,
  ConsumerUpdateAutoConversionRulePayload,
};
