import { Inject, Injectable } from '@nestjs/common'
import { CONSUMER } from 'src/dtos'

import { BaseService } from '../../../common'
import { IAddressDetailsModel } from '../../../models'

import { AddressDetailsRepository } from './address-details.repository'

@Injectable()
export class AddressDetailsService extends BaseService<IAddressDetailsModel, AddressDetailsRepository> {
  constructor(@Inject(AddressDetailsRepository) repository: AddressDetailsRepository) {
    super(repository)
  }

  async upsertAddressDetails(addressDetailsBody: CONSUMER.AddressDetails) {
    console.log(JSON.stringify({ body: addressDetailsBody }, null, 2))
    return null
  }
}
