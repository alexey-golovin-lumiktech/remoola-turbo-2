import { Inject, Injectable } from '@nestjs/common'

import { IPersonalDetailsModel } from '@wirebill/shared-common/models'

import { BaseService } from '../../../common'

import { AdminPersonalDetailsRepository } from './admin-personal-details.repository'

@Injectable()
export class AdminPersonalDetailsService extends BaseService<IPersonalDetailsModel, AdminPersonalDetailsRepository> {
  constructor(@Inject(AdminPersonalDetailsRepository) repository: AdminPersonalDetailsRepository) {
    super(repository)
  }
}
