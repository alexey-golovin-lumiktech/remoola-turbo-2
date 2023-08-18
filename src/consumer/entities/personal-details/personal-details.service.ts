import { Inject, Injectable } from '@nestjs/common'

import { IPersonalDetailsModel } from '@wirebill/shared-common/models'

import { BaseService } from '../../../common'
import { CONSUMER } from '../../../dtos'
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

  async upsert(dto: CONSUMER.PersonalDetailsCreate): Promise<IPersonalDetailsModel> {
    const exist = await this.repository.findById(dto.consumerId)
    const personalDetails = exist == null ? await this.repository.create(dto) : await this.repository.updateById(exist.id, dto)
    return personalDetails
  }
}
