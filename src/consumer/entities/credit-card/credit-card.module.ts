import { forwardRef, Module } from '@nestjs/common'

import { ConsumerModule } from '../consumer/consumer.module'

import { CreditCardRepository } from './credit-card.repository'
import { CreditCardService } from './credit-card.service'

@Module({
  imports: [forwardRef(() => ConsumerModule)],
  providers: [CreditCardRepository, CreditCardService],
  exports: [CreditCardRepository, CreditCardService],
})
export class CreditCardModule {}
