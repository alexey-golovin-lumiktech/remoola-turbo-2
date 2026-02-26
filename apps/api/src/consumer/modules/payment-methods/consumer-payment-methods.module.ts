import { Module } from '@nestjs/common';

import { ConsumerPaymentMethodsController } from './consumer-payment-methods.controller';
import { providers } from './providers';
import { StripeWebhookController } from './stripe-webhook.controller';
import { ConsumerStripeController } from './stripe.controller';
import { MailingModule } from '../../../shared/mailing.module';
import { ConsumerPaymentsModule } from '../payments/consumer-payments.module';

@Module({
  imports: [MailingModule, ConsumerPaymentsModule],
  controllers: [StripeWebhookController, ConsumerStripeController, ConsumerPaymentMethodsController],
  providers: [...providers],
})
export class ConsumerPaymentMethodsModule {}
