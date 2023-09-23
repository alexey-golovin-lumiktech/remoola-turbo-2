import { forwardRef, Module } from '@nestjs/common'

import { CreditCardRepository } from '../../../repositories'
import { ConsumerModule } from '../consumer/consumer.module'

import { CreditCardService } from './credit-card.service'

@Module({
  imports: [forwardRef(() => ConsumerModule)],
  providers: [CreditCardRepository, CreditCardService],
  exports: [CreditCardRepository, CreditCardService],
})
export class CreditCardModule {}
