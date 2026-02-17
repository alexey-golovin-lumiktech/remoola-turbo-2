import { type TPaymentMethodType } from '@remoola/api-types';

export type PaymentMethodType = TPaymentMethodType;

export type BillingDetails = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
};

export type PaymentMethodItem = {
  id: string;

  type: PaymentMethodType;

  defaultSelected: boolean;
  brand: string;
  last4: string;

  expMonth?: string | null;
  expYear?: string | null;

  serviceFee: number;

  billingDetails?: BillingDetails | null;

  billingDetailsId: string;
  consumerId: string;

  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type CreatePaymentMethodDto = {
  type: PaymentMethodType;

  defaultSelected?: boolean;

  brand?: string;
  last4?: string;
  expMonth?: string;
  expYear?: string;

  billingName?: string;
  billingEmail?: string;
  billingPhone?: string;

  setupIntentId?: string;
  stripePaymentMethodId?: string;
};

export type UpdatePaymentMethodDto = {
  billingName?: string;
  billingEmail?: string;
  billingPhone?: string;
  defaultSelected?: boolean;
};

export type StripeSetupIntentPayload = {
  clientSecret: string;
  setupIntentId: string;
};
