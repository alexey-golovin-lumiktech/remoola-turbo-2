import { Inject, Injectable } from '@nestjs/common'
import { BaseService } from 'src/common'

import { ICreditCardModel } from '@wirebill/shared-common/models'

import { ConsumerService } from '../consumer/consumer.service'

import { CreditCardRepository } from './credit-card.repository'

@Injectable()
export class CreditCardService extends BaseService<ICreditCardModel, CreditCardRepository> {
  constructor(
    @Inject(CreditCardRepository) repository: CreditCardRepository,
    @Inject(ConsumerService) private readonly consumersService: ConsumerService,
  ) {
    super(repository)
  }
}
