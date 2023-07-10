import { Inject, Injectable } from '@nestjs/common'

import { IBaseModel, IGoogleProfileDetailsModel } from '@wirebill/shared-common/models'

import { BaseService, IBaseService } from '../../../common'

import { GoogleProfileDetailsRepository } from './google-profile-details.repository'

export type IUpsertGoogleProfileDetails = Omit<IGoogleProfileDetailsModel, keyof IBaseModel | `data` | `consumerId`>

@Injectable()
export class GoogleProfileDetailsService
  extends BaseService<IGoogleProfileDetailsModel, GoogleProfileDetailsRepository>
  implements IBaseService<IGoogleProfileDetailsModel, GoogleProfileDetailsRepository>
{
  constructor(@Inject(GoogleProfileDetailsRepository) repository: GoogleProfileDetailsRepository) {
    super(repository)
  }

  async upsert(consumerId: string, dto: IUpsertGoogleProfileDetails): Promise<IGoogleProfileDetailsModel> {
    const [exist] = await this.repository.find({ filter: { consumerId } })
    const data = { ...dto, consumerId, data: JSON.stringify(dto) }
    const result = exist == null ? await this.repository.create(data) : await this.repository.updateById(exist.id, data)
    return result
  }
}
