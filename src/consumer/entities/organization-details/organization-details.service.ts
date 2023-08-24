import { Inject, Injectable } from '@nestjs/common'

import { IOrganizationDetailsModel } from '@wirebill/shared-common/models'

import { BaseService } from '../../../common'
import { CONSUMER } from '../../../dtos'

import { OrganizationDetailsRepository } from './organization-details.repository'

@Injectable()
export class OrganizationDetailsService extends BaseService<IOrganizationDetailsModel, OrganizationDetailsRepository> {
  constructor(@Inject(OrganizationDetailsRepository) repository: OrganizationDetailsRepository) {
    super(repository)
  }

  async upsert(dto: CONSUMER.OrganizationDetailsCreate): Promise<IOrganizationDetailsModel> {
    const exist = await this.repository.findById(dto.consumerId)
    const organizationDetails = exist == null ? await this.repository.create(dto) : await this.repository.updateById(exist.id, dto)
    return organizationDetails
  }
}
