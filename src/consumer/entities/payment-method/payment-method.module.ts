import { Module } from '@nestjs/common'

import { PaymentMethodRepository } from '../../../repositories'

import { PaymentMethodController } from './payment-method.controller'
import { PaymentMethodService } from './payment-method.service'

@Module({
  controllers: [PaymentMethodController],
  providers: [PaymentMethodRepository, PaymentMethodService],
  exports: [PaymentMethodRepository, PaymentMethodService],
})
export class PaymentMethodModule {}
