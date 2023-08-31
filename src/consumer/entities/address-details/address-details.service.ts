import { BadRequestException, Inject, Injectable } from '@nestjs/common'

import { IAddressDetailsModel } from '@wirebill/shared-common/models'

import { BaseService } from '../../../common'
import { CONSUMER } from '../../../dtos'
import { ConsumerService } from '../consumer/consumer.service'

import { AddressDetailsRepository } from './address-details.repository'

@Injectable()
export class AddressDetailsService extends BaseService<IAddressDetailsModel, AddressDetailsRepository> {
  constructor(
    @Inject(AddressDetailsRepository) repository: AddressDetailsRepository,
    @Inject(ConsumerService) private readonly consumerService: ConsumerService,
  ) {
    super(repository)
  }

  async upsert(consumerId: string, body: CONSUMER.AddressDetailsCreate): Promise<IAddressDetailsModel> {
    const consumer = await this.consumerService.repository.findById(consumerId)
    if (consumer == null) throw new BadRequestException(`Consumer does not exist`)

    const exist = await this.repository.findOne(body)
    const addressDetails = exist == null ? await this.repository.create(body) : await this.repository.updateById(exist.id, body)
    if (addressDetails == null) throw new BadRequestException(`Something went wrong for creating address details`)

    await this.consumerService.repository.updateById(consumer.id, { addressDetailsId: addressDetails.id })
    return addressDetails
  }
}
