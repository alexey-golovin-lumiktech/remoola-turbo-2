/**
 * Payment method types. Re-exported from @remoola/api-types with backward-compatible aliases.
 */
import {
  type CreatePaymentMethodPayload,
  type TConsumerBillingDetails,
  type TConsumerPaymentMethodItem,
  type TPaymentMethod,
  type TStripeSetupIntentPayload,
  type UpdatePaymentMethodPayload,
} from '@remoola/api-types';

export type PaymentMethodType = TPaymentMethod;
export type BillingDetails = TConsumerBillingDetails;
export type PaymentMethodItem = TConsumerPaymentMethodItem;
export type CreatePaymentMethodDto = CreatePaymentMethodPayload;
export type UpdatePaymentMethodDto = UpdatePaymentMethodPayload;
export type StripeSetupIntentPayload = TStripeSetupIntentPayload;
