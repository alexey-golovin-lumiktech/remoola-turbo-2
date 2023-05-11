import { Inject, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { BaseService } from '../../../common/base.service'
import { IBaseModel, IConsumerModel } from '../../../models'
import { AddressesService } from '../addresses/addresses.service'
import { BillingDetailsService } from '../billing-details/billing-details.service'

import { ConsumersRepository } from './consumers.repository'

@Injectable()
export class ConsumersService extends BaseService<IConsumerModel, ConsumersRepository> {
  private readonly logger = new Logger(ConfigService.name)

  constructor(
    @Inject(ConsumersRepository) repository: ConsumersRepository,
    @Inject(BillingDetailsService) private readonly billingDetailsService: BillingDetailsService,
    @Inject(AddressesService) private readonly addressesService: AddressesService
  ) {
    super(repository)
  }

  getConsumerById(consumerId: string): Promise<IConsumerModel | null> {
    return this.repository.findById(consumerId)
  }

  async upsertConsumer(dto: Omit<IConsumerModel, keyof IBaseModel>): Promise<IConsumerModel> {
    const [exist] = await this.repository.find({ filter: { email: dto.email } })
    const result = exist == null ? await this.repository.create(dto) : await this.repository.updateById(exist.id, dto)
    if (exist == null) this.addInitialBillingDetails(result.id) //init empty billing detail for the newest consumer
    return result
  }

  private async addInitialBillingDetails(consumerId: string) {
    let billingDetails = await this.billingDetailsService.upsertBillingDetails({ consumerId })
    if (billingDetails) {
      const address = await this.addressesService.upsertAddress({ consumerId, billingDetailsId: billingDetails.id })
      if (address) {
        billingDetails = await this.billingDetailsService.upsertBillingDetails({ consumerId, addressId: address.id })
        return { billingDetails, address }
      }
    }
    throw new Error(`Initial billingDetails is not created`)
  }
}
