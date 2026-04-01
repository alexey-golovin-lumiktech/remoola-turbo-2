import { type Provider } from '@nestjs/common';

import { ConsumerPaymentMethodsService } from './consumer-payment-methods.service';
import { StripeCheckoutScheduler } from './stripe-checkout.scheduler';
import { StripeReversalScheduler } from './stripe-reversal.scheduler';
import { StripeWebhookService } from './stripe-webhook.service';
import { ConsumerStripeService } from './stripe.service';

export const providers = [
  StripeWebhookService,
  ConsumerStripeService,
  ConsumerPaymentMethodsService,
  StripeCheckoutScheduler,
  StripeReversalScheduler,
] satisfies Provider[];
