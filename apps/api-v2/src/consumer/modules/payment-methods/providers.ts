import { type Provider } from '@nestjs/common';

import { ConsumerPaymentMethodsRepository } from './consumer-payment-methods.repository';
import { ConsumerPaymentMethodsService } from './consumer-payment-methods.service';
import { StripeCheckoutSchedulerRepository } from './stripe-checkout-scheduler.repository';
import { StripeCheckoutScheduler } from './stripe-checkout.scheduler';
import { StripePaymentRequestAccessRepository } from './stripe-payment-request-access.repository';
import { StripeReversalSchedulerRepository } from './stripe-reversal-scheduler.repository';
import { StripeReversalScheduler } from './stripe-reversal.scheduler';
import { StripeWebhookDeduplicationRepository } from './stripe-webhook-deduplication.repository';
import { StripeWebhookDeduplicationService } from './stripe-webhook-deduplication.service';
import { StripeWebhookEventProcessorService } from './stripe-webhook-event-processor.service';
import { StripeWebhookPaymentMethodsRepository } from './stripe-webhook-payment-methods.repository';
import { StripeWebhookPaymentMethodsService } from './stripe-webhook-payment-methods.service';
import { StripeWebhookPayoutsRepository } from './stripe-webhook-payouts.repository';
import { StripeWebhookPayoutsService } from './stripe-webhook-payouts.service';
import { StripeWebhookReversalNotificationOutboxRepository } from './stripe-webhook-reversal-notification-outbox.repository'; // eslint-disable-line
import { StripeWebhookReversalNotificationOutboxService } from './stripe-webhook-reversal-notification-outbox.service';
import { StripeWebhookReversalNotificationRepository } from './stripe-webhook-reversal-notification.repository';
import { StripeWebhookReversalNotificationService } from './stripe-webhook-reversal-notification.service';
import { StripeWebhookReversalsRepository } from './stripe-webhook-reversals.repository';
import { StripeWebhookReversalsService } from './stripe-webhook-reversals.service';
import { StripeWebhookRouterService } from './stripe-webhook-router.service';
import { StripeWebhookSettlementsRepository } from './stripe-webhook-settlements.repository';
import { StripeWebhookSettlementsService } from './stripe-webhook-settlements.service';
import { StripeWebhookVerificationRepository } from './stripe-webhook-verification.repository';
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
  StripeWebhookPaymentMethodsRepository,
  StripeWebhookPaymentMethodsService,
  StripeWebhookDeduplicationRepository,
  StripeWebhookDeduplicationService,
  StripeWebhookEventProcessorService,
  StripeWebhookPayoutsRepository,
  StripeWebhookPayoutsService,
  StripeWebhookSettlementsRepository,
  StripeWebhookSettlementsService,
  StripeWebhookVerificationRepository,
  StripeWebhookVerificationService,
  StripeWebhookReversalNotificationRepository,
  StripeWebhookReversalNotificationService,
  StripeWebhookReversalNotificationOutboxRepository,
  StripeWebhookReversalNotificationOutboxService,
  StripeWebhookReversalsRepository,
  StripeWebhookReversalsService,
  StripeWebhookRouterService,
  StripeWebhookService,
  StripePaymentRequestAccessRepository,
  ConsumerStripeService,
  ConsumerPaymentMethodsRepository,
  ConsumerPaymentMethodsService,
  StripeCheckoutSchedulerRepository,
  StripeCheckoutScheduler,
  StripeReversalSchedulerRepository,
  StripeReversalScheduler,
] satisfies Provider[];
