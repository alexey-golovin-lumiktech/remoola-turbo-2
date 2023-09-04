import { BadRequestException, Inject, Injectable } from '@nestjs/common'

import { IPersonalDetailsModel } from '@wirebill/shared-common/models'

import { BaseService } from '../../../common'
import { CONSUMER } from '../../../dtos'
import { PersonalDetailsRepository } from '../../../repositories'
import { ConsumerService } from '../consumer/consumer.service'

@Injectable()
export class PersonalDetailsService extends BaseService<IPersonalDetailsModel, PersonalDetailsRepository> {
  constructor(
    @Inject(PersonalDetailsRepository) repository: PersonalDetailsRepository,
    @Inject(ConsumerService) private readonly consumerService: ConsumerService,
  ) {
    super(repository)
  }

  async upsert(consumerId: string, body: CONSUMER.PersonalDetailsCreate): Promise<IPersonalDetailsModel> {
    const consumer = await this.consumerService.repository.findById(consumerId)
    if (consumer == null) throw new BadRequestException(`Consumer does not exist`)

    const exist = await this.repository.findOne(body)
    const personalDetails = exist == null ? await this.repository.create(body) : await this.repository.updateById(exist.id, body)
    if (personalDetails == null) throw new BadRequestException(`Something went wrong for creating address details`)

    await this.consumerService.repository.updateById(consumer.id, { personalDetailsId: personalDetails.id })
    return personalDetails
  }
}
