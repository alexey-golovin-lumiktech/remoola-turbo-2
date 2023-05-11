import { Inject, Injectable } from '@nestjs/common'

import { BaseService } from '../../../common/base.service'
import { IAddressModel, IBaseModel, IBillingDetailsModel } from '../../../models'
import { AddressesService } from '../addresses/addresses.service'

import { BillingDetailsRepository } from './billing-details.repository'

type IUpsertBillingDetails = Partial<Omit<IBillingDetailsModel, keyof IBaseModel>> & { consumerId: string }

@Injectable()
export class BillingDetailsService extends BaseService<IBillingDetailsModel, BillingDetailsRepository> {
  constructor(
    @Inject(BillingDetailsRepository) repo: BillingDetailsRepository,
    @Inject(AddressesService) private readonly addressesService: AddressesService
  ) {
    super(repo)
  }

  async upsertBillingDetails(dto: IUpsertBillingDetails): Promise<IBillingDetailsModel> {
    const [exist] = await this.repository.find({ filter: { consumerId: dto.consumerId } })
    const result = exist == null ? await this.repository.create(dto) : await this.repository.updateById(exist.id, dto)
    return result
  }

  async getBillingDetails(filter: { consumerId: string }) {
    const [billingDetails] = await this.repository.find({ filter })
    if (!billingDetails) return null
    const address = await this.addressesService.getAddress(Object.assign(filter, { billingDetailsId: billingDetails.id }))
    return this.buildStripeLikeBillingDetails(billingDetails, address)
  }

  private buildStripeLikeBillingDetails(billingDetails: IBillingDetailsModel, address: IAddressModel) {
    const { addressId, ...rest } = billingDetails
    return Object.assign(rest, { address })
  }
}
