import { type Provider } from '@nestjs/common';

import { ConsumerPaymentMethodsService } from './consumer-payment-methods.service';
import { StripeReversalScheduler } from './stripe-reversal.scheduler';
import { StripeWebhookService } from './stripe-webhook.service';
import { ConsumerStripeService } from './stripe.service';

export const providers = [
  StripeWebhookService,
  ConsumerStripeService,
  ConsumerPaymentMethodsService,
  StripeReversalScheduler,
] satisfies Provider[];
