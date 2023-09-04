import { Inject, Injectable } from '@nestjs/common'

import { IBillingDetailsModel } from '@wirebill/shared-common/models'

import { BaseService } from '../../../common'
import { BillingDetailsRepository } from '../../../repositories'

@Injectable()
export class AdminBillingDetailsService extends BaseService<IBillingDetailsModel, BillingDetailsRepository> {
  constructor(@Inject(BillingDetailsRepository) repository: BillingDetailsRepository) {
    super(repository)
  }
}
