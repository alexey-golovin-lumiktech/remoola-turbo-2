import { Inject, Injectable } from '@nestjs/common'
import { CONSUMER } from 'src/dtos'

import { IGoogleProfileDetailsUpdate } from '@wirebill/shared-common/dtos'
import { IGoogleProfileDetailsModel } from '@wirebill/shared-common/models'

import { BaseService, IBaseService } from '../../../common'
import { ConsumerService } from '../consumer/consumer.service'

import { GoogleProfileDetailsRepository } from './google-profile-details.repository'

@Injectable()
export class GoogleProfileDetailsService
  extends BaseService<IGoogleProfileDetailsModel, GoogleProfileDetailsRepository>
  implements IBaseService<IGoogleProfileDetailsModel, GoogleProfileDetailsRepository>
{
  constructor(
    @Inject(GoogleProfileDetailsRepository) repository: GoogleProfileDetailsRepository,
    @Inject(ConsumerService) private readonly consumersService: ConsumerService,
  ) {
    super(repository)
  }

  async upsert(consumerId: string, dto: Omit<IGoogleProfileDetailsUpdate, `data`>): Promise<IGoogleProfileDetailsModel> {
    const [exist] = await this.repository.find({ filter: { consumerId } })
    const data = { ...dto, consumerId, data: JSON.stringify(dto) }
    const result = exist == null ? await this.repository.create(data) : await this.repository.updateById(exist.id, data)
    return result
  }

  async getConsumerGoogleProfileDetails(filter: { consumerId: string }): Promise<CONSUMER.GoogleProfileDetailsResponse | null> {
    const [googleProfileDetails] = await this.repository.find({ filter })
    if (!googleProfileDetails) return null
    return googleProfileDetails
  }
}
