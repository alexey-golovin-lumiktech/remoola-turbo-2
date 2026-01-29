import { type Provider } from '@nestjs/common';

import { ConsumerPaymentMethodsService } from './consumer-payment-methods.service';
import { StripeWebhookService } from './stripe-webhook.service';
import { ConsumerStripeService } from './stripe.service';

export const providers = [
  StripeWebhookService,
  ConsumerStripeService,
  ConsumerPaymentMethodsService,
] satisfies Provider[];
