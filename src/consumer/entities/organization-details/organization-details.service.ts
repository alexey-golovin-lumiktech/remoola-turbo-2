import { Inject, Injectable } from '@nestjs/common'
import { CONSUMER } from 'src/dtos'

import { BaseService } from '../../../common'
import { IOrganizationDetailsModel } from '../../../models'

import { OrganizationDetailsRepository } from './organization-details.repository'

@Injectable()
export class OrganizationDetailsService extends BaseService<IOrganizationDetailsModel, OrganizationDetailsRepository> {
  constructor(@Inject(OrganizationDetailsRepository) repository: OrganizationDetailsRepository) {
    super(repository)
  }

  async upsertOrganizationDetails(consumerId: string, organizationDetailsBody: CONSUMER.OrganizationDetails) {
    console.log(JSON.stringify({ consumerId, organizationDetailsBody }, null, 2))
    return null
  }
}
