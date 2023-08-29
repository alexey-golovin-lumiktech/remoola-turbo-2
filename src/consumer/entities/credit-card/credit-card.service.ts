import { Inject, Injectable } from '@nestjs/common'

import { ICreditCardModel } from '@wirebill/shared-common/models'

import { BaseService } from '../../../common'

import { CreditCardRepository } from './credit-card.repository'

@Injectable()
export class CreditCardService extends BaseService<ICreditCardModel, CreditCardRepository> {
  constructor(@Inject(CreditCardRepository) repository: CreditCardRepository) {
    super(repository)
  }
}
