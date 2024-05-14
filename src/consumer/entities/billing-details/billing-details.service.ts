import { Inject, Injectable, Logger } from '@nestjs/common'

import { IBillingDetailsModel } from '@wirebill/shared-common/models'

import { BaseService } from '@-/common'
import { CONSUMER } from '@-/dtos'
import { BillingDetailsRepository } from '@-/repositories'

@Injectable()
export class BillingDetailsService extends BaseService<IBillingDetailsModel, BillingDetailsRepository> {
  logger = new Logger(BillingDetailsService.name)

  constructor(@Inject(BillingDetailsRepository) repository: BillingDetailsRepository) {
    super(repository)
  }

  async upsert(dto: CONSUMER.BillingDetailsUpdate): Promise<IBillingDetailsModel> {
    const exist = await this.repository.findOne(dto)
    return exist != null ? this.repository.updateById(exist.id, dto) : this.repository.create(dto)
  }
}
