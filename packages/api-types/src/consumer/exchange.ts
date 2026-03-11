/**
 * Consumer exchange: balance and quote/convert response shapes.
 * Shared by consumer-mobile (and consumer web) to avoid duplicated types.
 */

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
