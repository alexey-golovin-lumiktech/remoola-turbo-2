import { Module } from '@nestjs/common';

import { AdminV2SharedModule } from '../admin-v2-shared.module';
import { AdminV2PaymentMethodsController } from './admin-v2-payment-methods.controller';
import { AdminV2PaymentMethodsService } from './admin-v2-payment-methods.service';

@Module({
  imports: [AdminV2SharedModule],
  controllers: [AdminV2PaymentMethodsController],
  providers: [AdminV2PaymentMethodsService],
  exports: [AdminV2PaymentMethodsService],
})
export class AdminV2PaymentMethodsModule {}
