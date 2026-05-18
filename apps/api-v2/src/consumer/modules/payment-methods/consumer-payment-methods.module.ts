import { Module } from '@nestjs/common';

import { ConsumerPaymentMethodsController } from './consumer-payment-methods.controller';
import { ConsumerVerificationController } from './consumer-verification.controller';
import { providers } from './providers';
import { StripeWebhookReversalNotificationOutboxController } from './stripe-webhook-reversal-notification-outbox.controller'; // eslint-disable-line max-len
import { StripeWebhookController } from './stripe-webhook.controller';
import { ConsumerStripeController } from './stripe.controller';
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
