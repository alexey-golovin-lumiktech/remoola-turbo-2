import { Inject, Injectable } from '@nestjs/common'
import { BaseService } from 'src/common'

import { ICreditCardModel } from '@wirebill/shared-common/models'

import { CreditCardRepository } from './credit-card.repository'

@Injectable()
export class CreditCardService extends BaseService<ICreditCardModel, CreditCardRepository> {
  constructor(@Inject(CreditCardRepository) repository: CreditCardRepository) {
    super(repository)
  }
}
