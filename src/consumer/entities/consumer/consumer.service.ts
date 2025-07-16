import { Inject, Injectable } from '@nestjs/common'

import { IConsumerModel } from '@wirebill/shared-common/models'

import { BaseService, IBaseService } from '../../../common'
import { CONSUMER } from '../../../dtos'
import { ConsumerRepository } from '../../../repositories'

@Injectable()
export class ConsumerService
  extends BaseService<IConsumerModel, ConsumerRepository>
  implements IBaseService<IConsumerModel, ConsumerRepository>
{
  constructor(@Inject(ConsumerRepository) repository: ConsumerRepository) {
    super(repository)
  }

  getById(consumerId: string): Promise<IConsumerModel | null> {
    return this.repository.findById(consumerId)
  }

  async upsert(dto: CONSUMER.ConsumerCreate | CONSUMER.ConsumerUpdate): Promise<IConsumerModel> {
    const exist = await this.repository.findOne({ email: dto.email })
    return exist != null ? this.repository.updateById(exist.id, dto) : this.repository.create(dto)
  }
}
