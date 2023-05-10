import { Inject, Injectable } from '@nestjs/common'

import { BaseService } from '../../../common/base.service'
import { IConsumerModel } from '../../../models'
import { GoogleProfilesRepository } from '../googleProfiles/googleProfiles.repository'

import { ConsumersRepository } from './consumers.repository'

@Injectable()
export class ConsumersService extends BaseService<IConsumerModel, ConsumersRepository> {
  constructor(
    @Inject(ConsumersRepository) consumerRepository: ConsumersRepository,
    @Inject(GoogleProfilesRepository) private googleProfileRepository: GoogleProfilesRepository
  ) {
    super(consumerRepository)
  }

  async findByEmail(email: string): Promise<IConsumerModel | null> {
    const [consumer] = await this.repository.find({ filter: { email, deletedAt: null } })
    if (consumer) {
      const [profile] = await this.googleProfileRepository.find({ filter: { id: consumer.googleProfileId, deletedAt: null } })
      if (profile) Object.assign(consumer, { picture: profile.picture })
    }
    return consumer
  }
}
