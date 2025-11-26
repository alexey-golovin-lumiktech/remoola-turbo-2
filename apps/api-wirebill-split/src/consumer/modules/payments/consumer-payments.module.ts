import { Module } from '@nestjs/common';
import { StripeModule } from 'nestjs-stripe';

import { ConsumerPaymentsController } from './consumer-payments.controller';
import { ConsumerPaymentsService } from './consumer-payments.service';
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
  controllers: [ConsumerPaymentsController],
  providers: [ConsumerPaymentsService],
  exports: [ConsumerPaymentsService],
})
export class ConsumerPaymentsModule {}
