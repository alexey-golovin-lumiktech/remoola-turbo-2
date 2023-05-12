import { Inject, Injectable } from '@nestjs/common'

import { BaseService } from '../../../common'
import { IBaseModel, IBillingDetailsModel } from '../../../models'
import { AddressesService } from '../addresses/addresses.service'

import { BillingDetailsRepository } from './billing-details.repository'

import { IBillingDetailsResponse } from 'src/dtos/consumer/billing-details.dto'

type IUpsertBillingDetails = Partial<Omit<IBillingDetailsModel, keyof IBaseModel>> & { consumerId: string }

@Injectable()
export class BillingDetailsService extends BaseService<IBillingDetailsModel, BillingDetailsRepository> {
  constructor(
    @Inject(BillingDetailsRepository) repo: BillingDetailsRepository,
    @Inject(AddressesService) private readonly addressesService: AddressesService,
  ) {
    super(repo)
  }

  async upsertBillingDetails(dto: IUpsertBillingDetails): Promise<IBillingDetailsModel> {
    const [exist] = await this.repository.find({ filter: { consumerId: dto.consumerId } })
    const result = exist == null ? await this.repository.create(dto) : await this.repository.updateById(exist.id, dto)
    return result
  }

  async getBillingDetails(filter: { consumerId: string }): Promise<IBillingDetailsResponse> {
    const [billingDetails] = await this.repository.find({ filter })
    if (!billingDetails) return null
    const address = await this.addressesService.getAddress(Object.assign(filter, { billingDetailsId: billingDetails.id }))
    return Object.assign(billingDetails, { address })
  }
}
