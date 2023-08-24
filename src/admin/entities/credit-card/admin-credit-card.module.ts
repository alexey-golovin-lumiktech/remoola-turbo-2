import { Module } from '@nestjs/common'

import { AdminConsumerModule } from '../consumer/admin-consumer.module'

import { AdminCreditCardController } from './admin-credit-card.controller'
import { AdminCreditCardRepository } from './admin-credit-card.repository'
import { AdminCreditCardService } from './admin-credit-card.service'

@Module({
  imports: [AdminConsumerModule],
  controllers: [AdminCreditCardController],
  providers: [AdminCreditCardRepository, AdminCreditCardService],
  exports: [AdminCreditCardRepository, AdminCreditCardService],
})
export class AdminCreditCardModule {}
