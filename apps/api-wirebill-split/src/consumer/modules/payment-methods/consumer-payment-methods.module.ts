import { Module } from '@nestjs/common';
import { StripeModule } from 'nestjs-stripe';

import { ConsumerPaymentMethodsController } from './consumer-payment-methods.controller';
import { ConsumerPaymentMethodsService } from './consumer-payment-methods.service';
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
  controllers: [ConsumerPaymentMethodsController],
  providers: [ConsumerPaymentMethodsService],
  exports: [ConsumerPaymentMethodsService],
})
export class ConsumerPaymentMethodsModule {}
