import { Inject, Injectable } from '@nestjs/common'

import { IGoogleProfileDetailsModel } from '@wirebill/shared-common/models'

import { BaseService, IBaseService } from '../../../common'
import { CONSUMER } from '../../../dtos'

import { GoogleProfileDetailsRepository } from './google-profile-details.repository'

@Injectable()
export class GoogleProfileDetailsService
  extends BaseService<IGoogleProfileDetailsModel, GoogleProfileDetailsRepository>
  implements IBaseService<IGoogleProfileDetailsModel, GoogleProfileDetailsRepository>
{
  constructor(@Inject(GoogleProfileDetailsRepository) repository: GoogleProfileDetailsRepository) {
    super(repository)
  }

  async upsert(consumerId: string, dto: CONSUMER.GoogleProfileDetailsUpdate): Promise<IGoogleProfileDetailsModel> {
    const exist = await this.repository.findOne({ email: dto.email })
    const data = { ...dto, consumerId, metadata: JSON.stringify(dto) }
    const result = exist == null ? await this.repository.create(data) : await this.repository.updateById(exist.id, data)
    return result
  }
}
