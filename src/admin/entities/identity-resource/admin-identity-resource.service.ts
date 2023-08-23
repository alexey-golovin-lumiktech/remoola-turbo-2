import { Inject, Injectable } from '@nestjs/common'
import { BaseService } from 'src/common'

import { IIdentityResourceModel } from '@wirebill/shared-common/models'

import { AdminIdentityResourceRepository } from './admin-identity-resource.repository'

@Injectable()
export class AdminIdentityResourceService extends BaseService<IIdentityResourceModel, AdminIdentityResourceRepository> {
  constructor(@Inject(AdminIdentityResourceRepository) repository: AdminIdentityResourceRepository) {
    super(repository)
  }
}
