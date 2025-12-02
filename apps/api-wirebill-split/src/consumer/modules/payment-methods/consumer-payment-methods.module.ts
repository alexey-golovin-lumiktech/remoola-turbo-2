import { Module } from '@nestjs/common';
import { StripeModule } from 'nestjs-stripe';

import { ConsumerPaymentMethodsController } from './consumer-payment-methods.controller';
import { ConsumerPaymentMethodsService } from './consumer-payment-methods.service';
import { StripeWebhookController } from './stripe-webhook.controller';
import { StripeWebhookService } from './stripe-webhook.service';
import { ConsumerStripeController } from './stripe.controller';
import { ConsumerStripeService } from './stripe.service';
import { envs } from '../../../envs';

@Module({
  imports: [
    StripeModule.forRootAsync({
      useFactory: () => {
        return {
          apiKey: envs.STRIPE_SECRET_KEY,
          apiVersion: `2025-11-17.clover`,
        };
      },
    }),
  ],
  controllers: [StripeWebhookController, ConsumerStripeController, ConsumerPaymentMethodsController],
  providers: [StripeWebhookService, ConsumerStripeService, ConsumerPaymentMethodsService],
  exports: [ConsumerPaymentMethodsService],
})
export class ConsumerPaymentMethodsModule {}
