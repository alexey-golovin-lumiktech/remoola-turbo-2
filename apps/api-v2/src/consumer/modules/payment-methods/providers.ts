import { type Provider } from '@nestjs/common';

import { ConsumerPaymentMethodsService } from './consumer-payment-methods.service';
import { StripeCheckoutScheduler } from './stripe-checkout.scheduler';
import { StripeReversalScheduler } from './stripe-reversal.scheduler';
import { StripeWebhookPaymentMethodsService } from './stripe-webhook-payment-methods.service';
import { StripeWebhookPayoutsService } from './stripe-webhook-payouts.service';
import { StripeWebhookReversalsService } from './stripe-webhook-reversals.service';
import { StripeWebhookSettlementsService } from './stripe-webhook-settlements.service';
import { StripeWebhookVerificationService } from './stripe-webhook-verification.service';
import { StripeWebhookService } from './stripe-webhook.service';
import { CONSUMER_STRIPE_WEBHOOK_CLIENT } from './stripe-webhook.tokens';
import { ConsumerStripeService } from './stripe.service';
import { STRIPE_CLIENT } from '../../../shared/stripe-client';

export const providers = [
  {
    provide: CONSUMER_STRIPE_WEBHOOK_CLIENT,
    useExisting: STRIPE_CLIENT,
  },
  StripeWebhookPaymentMethodsService,
  StripeWebhookPayoutsService,
  StripeWebhookSettlementsService,
  StripeWebhookVerificationService,
  StripeWebhookReversalsService,
  StripeWebhookService,
  ConsumerStripeService,
  ConsumerPaymentMethodsService,
  StripeCheckoutScheduler,
  StripeReversalScheduler,
] satisfies Provider[];
