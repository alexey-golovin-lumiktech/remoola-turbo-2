import { Module } from '@nestjs/common'

import { CreditCardRepository } from '../../../repositories'

import { CreditCardService } from './credit-card.service'

@Module({
  providers: [CreditCardRepository, CreditCardService],
  exports: [CreditCardRepository, CreditCardService],
})
export class CreditCardModule {}
