import { forwardRef, Module } from '@nestjs/common'

import { CreditCardRepository } from '../../../repositories'
import { ConsumerModule } from '../consumer/consumer.module'

import { CreditCardController } from './credit-card.controller'
import { CreditCardService } from './credit-card.service'

@Module({
  imports: [forwardRef(() => ConsumerModule)],
  controllers: [CreditCardController],
  providers: [CreditCardRepository, CreditCardService],
  exports: [CreditCardRepository, CreditCardService],
})
export class CreditCardModule {}
