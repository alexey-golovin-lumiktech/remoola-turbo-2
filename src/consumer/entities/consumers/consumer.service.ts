import { Inject, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { BaseService, IBaseModel, IBaseService } from '../../../common'
import { IConsumerModel } from '../../../models'
import { BillingDetailsService } from '../billing-details/billing-details.service'

import { ConsumersRepository } from './consumer.repository'

type UpsertConsumer = Pick<IConsumerModel, `email`> & Partial<Omit<IConsumerModel, keyof IBaseModel>>

@Injectable()
export class ConsumersService
  extends BaseService<IConsumerModel, ConsumersRepository>
  implements IBaseService<IConsumerModel, ConsumersRepository>
{
  private readonly logger = new Logger(ConfigService.name)

  constructor(
    @Inject(ConsumersRepository) repository: ConsumersRepository,
    @Inject(BillingDetailsService) private readonly billingDetailsService: BillingDetailsService,
  ) {
    super(repository)
  }

  getConsumerById(consumerId: string): Promise<IConsumerModel | null> {
    return this.repository.findById(consumerId)
  }

  async upsertConsumer(dto: UpsertConsumer): Promise<IConsumerModel> {
    const [exist] = await this.repository.find({ filter: { email: dto.email } })
    const result = exist == null ? await this.repository.create(dto) : await this.repository.updateById(exist.id, dto)
    if (exist == null) this.addInitialBillingDetails(result) //init empty billing detail for the newest consumer
    return result
  }

  private async addInitialBillingDetails(consumer: IConsumerModel) {
    const { id: consumerId, email, firstName, lastName } = consumer
    const name = `${firstName} ${lastName}`
    const billingDetails = await this.billingDetailsService.upsertBillingDetails({ consumerId, email, name })
    return billingDetails
  }
}
