/**
 * Consumer payment method API contract types. Shared by consumer app and API.
 */

import { type TPaymentMethod } from '../payments';

export type TConsumerBillingDetails = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
};

export type TConsumerPaymentMethodItem = {
  id: string;
  type: TPaymentMethod;
  defaultSelected: boolean;
  brand: string;
  last4: string;
  expMonth?: string | null;
  expYear?: string | null;
  serviceFee: number;
  billingDetails?: TConsumerBillingDetails | null;
  billingDetailsId: string;
  consumerId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type CreatePaymentMethodPayload = {
  type: TPaymentMethod;
  defaultSelected?: boolean;
  brand?: string;
  last4?: string;
  expMonth?: string;
  expYear?: string;
  billingName?: string;
  billingEmail?: string;
  billingPhone?: string;
  stripePaymentMethodId?: string;
};

export type UpdatePaymentMethodPayload = {
  billingName?: string;
  billingEmail?: string;
  billingPhone?: string;
  defaultSelected?: boolean;
};

export type TStripeSetupIntentPayload = {
  clientSecret: string;
};
