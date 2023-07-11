import { Inject, Injectable } from '@nestjs/common'

import { IBillingDetailsModel } from '@wirebill/shared-common/models'

import { BaseService } from '../../../common'

import { AdminBillingDetailsRepository } from './admin-billing-details.repository'

@Injectable()
export class AdminBillingDetailsService extends BaseService<IBillingDetailsModel, AdminBillingDetailsRepository> {
  constructor(@Inject(AdminBillingDetailsRepository) repository: AdminBillingDetailsRepository) {
    super(repository)
  }
}
