import { Module } from '@nestjs/common'

import { PaymentMethodRepository } from '../../../repositories'

import { AdminPaymentMethodController } from './admin-payment-method.controller'
import { AdminPaymentMethodService } from './admin-payment-method.service'

@Module({
  controllers: [AdminPaymentMethodController],
  providers: [PaymentMethodRepository, AdminPaymentMethodService],
  exports: [PaymentMethodRepository, AdminPaymentMethodService],
})
export class AdminPaymentMethodModule {}
