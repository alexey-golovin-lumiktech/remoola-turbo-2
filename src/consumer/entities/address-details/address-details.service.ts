import { Inject, Injectable } from '@nestjs/common'

import { IAddressDetailsModel } from '@wirebill/shared-common/models'

import { BaseService } from '../../../common'
import { CONSUMER } from '../../../dtos'
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

  async upsert(dto: CONSUMER.AddressDetailsCreate): Promise<IAddressDetailsModel> {
    const exist = await this.repository.findById(dto.consumerId)
    const addressDetails = exist == null ? await this.repository.create(dto) : await this.repository.updateById(exist.id, dto)
    return addressDetails
  }
}
