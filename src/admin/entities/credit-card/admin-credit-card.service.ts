import { Inject, Injectable } from '@nestjs/common'

import { ICreditCardModel } from '@wirebill/shared-common/models'

import { BaseService } from '../../../common'
import { AdminConsumerService } from '../consumer/admin-consumer.service'

import { AdminCreditCardRepository } from './admin-credit-card.repository'

@Injectable()
export class AdminCreditCardService extends BaseService<ICreditCardModel, AdminCreditCardRepository> {
  constructor(
    @Inject(AdminCreditCardRepository) repository: AdminCreditCardRepository,
    @Inject(AdminConsumerService) private readonly adminConsumerService: AdminConsumerService,
  ) {
    super(repository)
  }
}
