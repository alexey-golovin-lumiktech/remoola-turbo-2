import { Inject, Injectable } from '@nestjs/common'

import { ICreditCardModel } from '@wirebill/shared-common/models'

import { BaseService } from '../../../common'
import { CreditCardRepository } from '../../../repositories'

@Injectable()
export class AdminCreditCardService extends BaseService<ICreditCardModel, CreditCardRepository> {
  constructor(@Inject(CreditCardRepository) repository: CreditCardRepository) {
    super(repository)
  }
}
