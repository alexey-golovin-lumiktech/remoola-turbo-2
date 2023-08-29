import { Inject, Injectable } from '@nestjs/common'

import { IConsumerModel } from '@wirebill/shared-common/models'

import { BaseService, IBaseService } from '../../../common'
import { CONSUMER } from '../../../dtos'
import { BillingDetailsService } from '../billing-details/billing-details.service'

import { ConsumerRepository } from './consumer.repository'

@Injectable()
export class ConsumerService
  extends BaseService<IConsumerModel, ConsumerRepository>
  implements IBaseService<IConsumerModel, ConsumerRepository>
{
  constructor(
    @Inject(ConsumerRepository) repository: ConsumerRepository,
    @Inject(BillingDetailsService) private readonly billingDetailsService: BillingDetailsService,
  ) {
    super(repository)
  }

  getById(consumerId: string): Promise<IConsumerModel | null> {
    return this.repository.findById(consumerId)
  }

  async upsert(dto: CONSUMER.ConsumerCreate | CONSUMER.ConsumerUpdate): Promise<IConsumerModel> {
    const exist = await this.repository.findOne({ email: dto.email })
    if (exist != null) {
      const updated = this.repository.updateById(exist.id, dto)
      return updated
    }

    const consumer = await this.repository.create(dto)
    await this.addInitialBillingDetails(consumer)
    return consumer
  }

  private addInitialBillingDetails(consumer: IConsumerModel) {
    const { id: consumerId, email, firstName, lastName } = consumer
    const name = `${firstName} ${lastName}`
    return this.billingDetailsService.upsert({ consumerId, email, name })
  }

  // private inviteNewestConsumer
}
