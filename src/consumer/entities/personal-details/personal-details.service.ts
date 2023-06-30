import { Inject, Injectable } from '@nestjs/common'

import { BaseService } from '../../../common'
import { CONSUMER } from '../../../dtos'
import { IPersonalDetailsModel } from '../../../models'
import { ConsumerService } from '../consumer/consumer.service'

import { PersonalDetailsRepository } from './personal-details.repository'

@Injectable()
export class PersonalDetailsService extends BaseService<IPersonalDetailsModel, PersonalDetailsRepository> {
  constructor(
    @Inject(PersonalDetailsRepository) repository: PersonalDetailsRepository,
    @Inject(ConsumerService) private readonly consumersService: ConsumerService,
  ) {
    super(repository)
  }

  async upsertPersonalDetails(dto: CONSUMER.CreatePersonalDetails): Promise<CONSUMER.PersonalDetailsResponse | never> {
    const [exist] = await this.repository.find({ filter: { consumerId: dto.consumerId } })
    const personalDetails = exist == null ? await this.repository.create(dto) : await this.repository.updateById(exist.id, dto)
    return personalDetails
  }
}
