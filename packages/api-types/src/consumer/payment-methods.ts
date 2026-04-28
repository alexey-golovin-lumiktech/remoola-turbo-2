import {
  type ConsumerBillingDetailsResponse,
  type ConsumerPaymentMethodItem,
  type ConsumerStripeSetupIntentResponse,
} from './responses';
import { type TPaymentMethod } from '../payments';

export type TConsumerBillingDetails = ConsumerBillingDetailsResponse;

export type TConsumerPaymentMethodItem = Omit<ConsumerPaymentMethodItem, `type`> & {
  type: TPaymentMethod;
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

export type TStripeSetupIntentPayload = ConsumerStripeSetupIntentResponse;
