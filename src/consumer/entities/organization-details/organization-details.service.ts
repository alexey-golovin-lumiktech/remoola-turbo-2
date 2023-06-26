import { Inject, Injectable } from '@nestjs/common'

import { BaseService } from '../../../common'
import { CONSUMER } from '../../../dtos'
import { IOrganizationDetailsModel } from '../../../models'
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

  async upsertOrganizationDetails(dto: CONSUMER.CreateOrganizationDetails): Promise<CONSUMER.OrganizationDetailsResponse | never> {
    const [exist] = await this.repository.find({ filter: { consumerId: dto.consumerId } })
    const organizationDetails = exist == null ? await this.repository.create(dto) : await this.repository.updateById(exist.id, dto)
    await this.consumersService.repository.update({ id: dto.consumerId }, { organizationDetailsId: organizationDetails.id })
    return organizationDetails
  }
}
