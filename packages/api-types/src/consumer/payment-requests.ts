/**
 * Consumer payment request API contract types. Shared by consumer app and API.
 */

import { type TCurrencyCode } from '../currency';

export type CreatePaymentRequestPayload = {
  email: string;
  amount: string;
  currencyCode?: TCurrencyCode;
  description?: string;
  dueDate?: string;
};

export type PaymentRequestSummary = {
  id: string;
  amount: number;
  currencyCode: string;
  status: string;
  createdAt: string;
  description?: string | null;
};
