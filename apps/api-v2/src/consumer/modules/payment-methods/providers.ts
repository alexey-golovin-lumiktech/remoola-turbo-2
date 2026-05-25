import { type Provider } from '@nestjs/common';

import { ConsumerPaymentMethodsRepository } from './manual/consumer-payment-methods.repository';
import { ConsumerPaymentMethodsService } from './manual/consumer-payment-methods.service';
import { StripeCustomerAccessRepository } from './stripe/core/stripe-customer-access.repository';
import { StripePaymentOutcomesRepository } from './stripe/core/stripe-payment-outcomes.repository';
import { StripePaymentRequestAccessRepository } from './stripe/core/stripe-payment-request-access.repository';
// eslint-disable-next-line max-len
import { StripePaymentRequestLedgerBootstrapRepository } from './stripe/core/stripe-payment-request-ledger-bootstrap.repository';
import { StripeSavedPaymentMethodsRepository } from './stripe/core/stripe-saved-payment-methods.repository';
import { StripeSetupIntentPersistenceRepository } from './stripe/core/stripe-setup-intent-persistence.repository';
import { ConsumerStripeService } from './stripe/core/stripe.service';
// eslint-disable-next-line max-len
import { StripeWebhookReversalNotificationOutboxRepository } from './stripe/outbox/stripe-webhook-reversal-notification-outbox.repository';
// eslint-disable-next-line max-len
import { StripeWebhookReversalNotificationOutboxService } from './stripe/outbox/stripe-webhook-reversal-notification-outbox.service';
import { StripeCheckoutSchedulerRepository } from './stripe/schedulers/stripe-checkout-scheduler.repository';
import { StripeCheckoutScheduler } from './stripe/schedulers/stripe-checkout.scheduler';
import { StripeReversalSchedulerRepository } from './stripe/schedulers/stripe-reversal-scheduler.repository';
import { StripeReversalScheduler } from './stripe/schedulers/stripe-reversal.scheduler';
import { StripeWebhookDeduplicationRepository } from './stripe/webhooks/stripe-webhook-deduplication.repository';
import { StripeWebhookDeduplicationService } from './stripe/webhooks/stripe-webhook-deduplication.service';
import { StripeWebhookEventProcessorService } from './stripe/webhooks/stripe-webhook-event-processor.service';
import { StripeWebhookPaymentMethodsRepository } from './stripe/webhooks/stripe-webhook-payment-methods.repository';
import { StripeWebhookPaymentMethodsService } from './stripe/webhooks/stripe-webhook-payment-methods.service';
import { StripeWebhookPayoutsRepository } from './stripe/webhooks/stripe-webhook-payouts.repository';
import { StripeWebhookPayoutsService } from './stripe/webhooks/stripe-webhook-payouts.service';
// eslint-disable-next-line max-len
import { StripeWebhookReversalNotificationRepository } from './stripe/webhooks/stripe-webhook-reversal-notification.repository';
// eslint-disable-next-line max-len
import { StripeWebhookReversalNotificationService } from './stripe/webhooks/stripe-webhook-reversal-notification.service';
import { StripeWebhookReversalsRepository } from './stripe/webhooks/stripe-webhook-reversals.repository';
import { StripeWebhookReversalsService } from './stripe/webhooks/stripe-webhook-reversals.service';
import { StripeWebhookRouterService } from './stripe/webhooks/stripe-webhook-router.service';
import { StripeWebhookSettlementsRepository } from './stripe/webhooks/stripe-webhook-settlements.repository';
import { StripeWebhookSettlementsService } from './stripe/webhooks/stripe-webhook-settlements.service';
import { StripeWebhookVerificationRepository } from './stripe/webhooks/stripe-webhook-verification.repository';
import { StripeWebhookVerificationService } from './stripe/webhooks/stripe-webhook-verification.service';
import { StripeWebhookService } from './stripe/webhooks/stripe-webhook.service';
import { CONSUMER_STRIPE_WEBHOOK_CLIENT } from './stripe/webhooks/stripe-webhook.tokens';
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
  StripeCustomerAccessRepository,
  StripePaymentOutcomesRepository,
  StripePaymentRequestLedgerBootstrapRepository,
  StripePaymentRequestAccessRepository,
  StripeSavedPaymentMethodsRepository,
  StripeSetupIntentPersistenceRepository,
  ConsumerStripeService,
  ConsumerPaymentMethodsRepository,
  ConsumerPaymentMethodsService,
  StripeCheckoutSchedulerRepository,
  StripeCheckoutScheduler,
  StripeReversalSchedulerRepository,
  StripeReversalScheduler,
] satisfies Provider[];
