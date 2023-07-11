import { Inject, Injectable } from '@nestjs/common'

import { IAddressDetailsModel } from '@wirebill/shared-common/models'

import { BaseService } from '../../../common'

import { AdminAddressDetailsRepository } from './admin-address-details.repository'

@Injectable()
export class AdminAddressDetailsService extends BaseService<IAddressDetailsModel, AdminAddressDetailsRepository> {
  constructor(@Inject(AdminAddressDetailsRepository) repository: AdminAddressDetailsRepository) {
    super(repository)
  }
}
