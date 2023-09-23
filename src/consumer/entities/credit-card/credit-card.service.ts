import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import { CONSUMER } from 'src/dtos'

import { ICreditCardModel } from '@wirebill/shared-common/models'

import { BaseService } from '../../../common'
import { CreditCardRepository } from '../../../repositories'
import { ConsumerService } from '../consumer/consumer.service'

@Injectable()
export class CreditCardService extends BaseService<ICreditCardModel, CreditCardRepository> {
  constructor(
    @Inject(CreditCardRepository) repository: CreditCardRepository,
    @Inject(ConsumerService) private readonly consumerService: ConsumerService,
  ) {
    super(repository)
  }

  async upsert(consumerId: string, dto: CONSUMER.CreditCardCreate | CONSUMER.CreditCardUpdate): Promise<CONSUMER.CreditCardResponse> {
    const consumer = await this.consumerService.repository.findById(consumerId)
    if (consumer == null) throw new BadRequestException(`Consumer does't exist`)

    const exist = await this.repository.findOne({ brand: dto.brand, last4: dto.last4 })
    const creditCard = exist != null ? await this.repository.updateById(exist.id, dto) : await this.repository.create(dto)
    if (creditCard == null) throw new BadRequestException(`Something went wrong for create credit card`)

    return creditCard
  }
}
