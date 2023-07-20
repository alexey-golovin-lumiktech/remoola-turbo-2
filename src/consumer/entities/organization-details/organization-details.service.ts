import { Inject, Injectable } from '@nestjs/common'

import { IOrganizationDetailsModel } from '@wirebill/shared-common/models'

import { BaseService } from '../../../common'
import { CONSUMER } from '../../../dtos'
import { ConsumerService } from '../consumer/consumer.service'

import { OrganizationDetailsRepository } from './organization-details.repository'

@Injectable()
export class OrganizationDetailsService extends BaseService<IOrganizationDetailsModel, OrganizationDetailsRepository> {
  constructor(
    @Inject(OrganizationDetailsRepository) repository: OrganizationDetailsRepository,
    @Inject(ConsumerService) private readonly consumersService: ConsumerService,
  ) {
    super(repository)
  }

  async upsert(dto: CONSUMER.CreateOrganizationDetails): Promise<CONSUMER.OrganizationDetailsResponse | never> {
    const exist = await this.repository.findById(dto.consumerId)
    const organizationDetails = exist == null ? await this.repository.create(dto) : await this.repository.updateById(exist.id, dto)
    return organizationDetails
  }
}
