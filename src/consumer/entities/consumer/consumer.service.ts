import { Inject, Injectable } from '@nestjs/common'

import { IBaseModel, IConsumerModel } from '@wirebill/shared-common/models'

import { BaseService, IBaseService } from '../../../common'
import { BillingDetailsService } from '../billing-details/billing-details.service'

import { ConsumerRepository } from './consumer.repository'

type UpsertConsumer = Pick<IConsumerModel, `email`> & Partial<Omit<IConsumerModel, keyof IBaseModel>>

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

  async upsert(dto: UpsertConsumer): Promise<IConsumerModel> {
    const exist = await this.repository.findOne({ email: dto.email })
    const result = exist == null ? await this.repository.create(dto) : await this.repository.updateById(exist.id, dto)
    if (exist == null) await this.addInitialBillingDetails(result) //init empty billing detail for the newest consumer
    return result
  }

  private addInitialBillingDetails(consumer: IConsumerModel) {
    const { id: consumerId, email, firstName, lastName } = consumer
    const name = `${firstName} ${lastName}`
    return this.billingDetailsService.upsert({ consumerId, email, name })
  }
}
