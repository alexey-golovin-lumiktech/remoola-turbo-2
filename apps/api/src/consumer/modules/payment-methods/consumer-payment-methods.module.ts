import { Module } from '@nestjs/common';

import { ConsumerPaymentMethodsController } from './consumer-payment-methods.controller';
import { providers } from './providers';
import { StripeWebhookController } from './stripe-webhook.controller';
import { ConsumerStripeController } from './stripe.controller';

@Module({
  imports: [],
  controllers: [StripeWebhookController, ConsumerStripeController, ConsumerPaymentMethodsController],
  providers: [...providers],
})
export class ConsumerPaymentMethodsModule {}
