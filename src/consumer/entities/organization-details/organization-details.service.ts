import { BadRequestException, Inject, Injectable } from '@nestjs/common'

import { IOrganizationDetailsModel } from '@wirebill/shared-common/models'

import { BaseService } from '../../../common'
import { CONSUMER } from '../../../dtos'
import { OrganizationDetailsRepository } from '../../../repositories'
import { ConsumerService } from '../consumer/consumer.service'

@Injectable()
export class OrganizationDetailsService extends BaseService<IOrganizationDetailsModel, OrganizationDetailsRepository> {
  constructor(
    @Inject(OrganizationDetailsRepository) repository: OrganizationDetailsRepository,
    @Inject(ConsumerService) private readonly consumerService: ConsumerService,
  ) {
    super(repository)
  }

  async upsert(consumerId: string, body: CONSUMER.OrganizationDetailsCreate): Promise<IOrganizationDetailsModel> {
    const consumer = await this.consumerService.repository.findById(consumerId)
    if (consumer == null) throw new BadRequestException(`Consumer does not exist`)

    const exist = await this.repository.findOne(body)
    const organizationDetails = exist == null ? await this.repository.create(body) : await this.repository.updateById(exist.id, body)
    if (organizationDetails == null) throw new BadRequestException(`Something went wrong for upsert organization details`)
    await this.consumerService.repository.updateById(consumer.id, { organizationDetailsId: organizationDetails.id })

    return organizationDetails
  }
}
