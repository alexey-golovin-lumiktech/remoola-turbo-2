import { Inject, Injectable } from '@nestjs/common'

import { IOrganizationDetailsModel } from '@wirebill/shared-common/models'

import { BaseService } from '../../../common'
import { OrganizationDetailsRepository } from '../../../repositories'

@Injectable()
export class AdminOrganizationDetailsService extends BaseService<IOrganizationDetailsModel, OrganizationDetailsRepository> {
  constructor(@Inject(OrganizationDetailsRepository) repository: OrganizationDetailsRepository) {
    super(repository)
  }
}
