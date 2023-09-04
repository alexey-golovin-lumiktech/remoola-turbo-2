import { Module } from '@nestjs/common'

import { CreditCardRepository } from '../../../repositories'
import { AdminConsumerModule } from '../consumer/admin-consumer.module'

import { AdminCreditCardController } from './admin-credit-card.controller'
import { AdminCreditCardService } from './admin-credit-card.service'

@Module({
  imports: [AdminConsumerModule],
  controllers: [AdminCreditCardController],
  providers: [CreditCardRepository, AdminCreditCardService],
  exports: [CreditCardRepository, AdminCreditCardService],
})
export class AdminCreditCardModule {}
