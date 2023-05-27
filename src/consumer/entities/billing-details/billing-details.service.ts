import { Inject, Injectable } from '@nestjs/common'

import { BaseService } from '../../../common'
import { CONSUMER } from '../../../dtos'
import { IBillingDetailsModel } from '../../../models'

import { BillingDetailsRepository } from './billing-details.repository'

@Injectable()
export class BillingDetailsService extends BaseService<IBillingDetailsModel, BillingDetailsRepository> {
  constructor(@Inject(BillingDetailsRepository) repository: BillingDetailsRepository) {
    super(repository)
  }

  async upsertBillingDetails(dto: CONSUMER.UpsertBillingDetails): Promise<IBillingDetailsModel> {
    const [exist] = await this.repository.find({ filter: { consumerId: dto.consumerId } })
    const result = exist == null ? await this.repository.create(dto) : await this.repository.updateById(exist.id, dto)
    return result
  }

  async getBillingDetails(filter: { consumerId: string }): Promise<CONSUMER.BillingDetailsResponse> {
    const [billingDetails] = await this.repository.find({ filter })
    if (!billingDetails) return null
    return billingDetails
  }
}
