import { Inject, Injectable } from '@nestjs/common'

import { IOrganizationDetailsModel } from '@wirebill/shared-common/models'

import { OrganizationDetailsRepository } from '@-/repositories'

import { BaseService } from '../../../common'

@Injectable()
export class AdminOrganizationDetailsService extends BaseService<IOrganizationDetailsModel, OrganizationDetailsRepository> {
  constructor(@Inject(OrganizationDetailsRepository) repository: OrganizationDetailsRepository) {
    super(repository)
  }
}
