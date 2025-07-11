import { Inject, Injectable } from '@nestjs/common'

import { IAddressDetailsModel } from '@wirebill/shared-common/models'

import { BaseService } from '@-/common'
import { AddressDetailsRepository } from '@-/repositories'

@Injectable()
export class AdminAddressDetailsService extends BaseService<IAddressDetailsModel, AddressDetailsRepository> {
  constructor(@Inject(AddressDetailsRepository) repository: AddressDetailsRepository) {
    super(repository)
  }
}
