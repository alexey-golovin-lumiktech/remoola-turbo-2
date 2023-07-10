import { Inject, Injectable } from '@nestjs/common'

import { IOrganizationDetailsModel } from '@wirebill/shared-common/models'

import { BaseService } from '../../../common'

import { AdminOrganizationDetailsRepository } from './admin-organization-details.repository'

@Injectable()
export class AdminOrganizationDetailsService extends BaseService<IOrganizationDetailsModel, AdminOrganizationDetailsRepository> {
  constructor(@Inject(AdminOrganizationDetailsRepository) repository: AdminOrganizationDetailsRepository) {
    super(repository)
  }
}
