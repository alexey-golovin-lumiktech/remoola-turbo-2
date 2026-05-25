import { Module } from '@nestjs/common';

import { ConsumerPaymentMethodsController } from './manual/consumer-payment-methods.controller';
import { ConsumerVerificationController } from './manual/consumer-verification.controller';
import { providers } from './providers';
import { ConsumerStripeController } from './stripe/core/stripe.controller';
import { StripeWebhookReversalNotificationOutboxController } from './stripe/outbox/stripe-webhook-reversal-notification-outbox.controller'; // eslint-disable-line max-len
import { StripeWebhookController } from './stripe/webhooks/stripe-webhook.controller';
import { InternalCronGuard } from '../../../common';
import { MailingModule } from '../../../shared/mailing.module';
import { ConsumerPaymentsModule } from '../payments/consumer-payments.module';

@Module({
  imports: [MailingModule, ConsumerPaymentsModule],
  controllers: [
    StripeWebhookController,
    ConsumerStripeController,
    ConsumerPaymentMethodsController,
    ConsumerVerificationController,
    StripeWebhookReversalNotificationOutboxController,
  ],
  providers: [...providers, InternalCronGuard],
})
export class ConsumerPaymentMethodsModule {}
