import { Inject, Injectable } from '@nestjs/common'

import { BaseService } from '../../../common'
import { CONSUMER } from '../../../dtos'
import { IAddressDetailsModel } from '../../../models'
import { ConsumerService } from '../consumer/consumer.service'

import { AddressDetailsRepository } from './address-details.repository'

@Injectable()
export class AddressDetailsService extends BaseService<IAddressDetailsModel, AddressDetailsRepository> {
  constructor(
    @Inject(AddressDetailsRepository) repository: AddressDetailsRepository,
    @Inject(ConsumerService) private readonly consumersService: ConsumerService,
  ) {
    super(repository)
  }

  async upsertAddressDetails(dto: CONSUMER.CreateAddressDetails): Promise<CONSUMER.AddressDetailsResponse | never> {
    const [exist] = await this.repository.find({ filter: { consumerId: dto.consumerId } })
    const addressDetails = exist == null ? await this.repository.create(dto) : await this.repository.updateById(exist.id, dto)
    await this.consumersService.repository.update({ id: dto.consumerId }, { addressDetailsId: addressDetails.id })
    return addressDetails
  }
}
