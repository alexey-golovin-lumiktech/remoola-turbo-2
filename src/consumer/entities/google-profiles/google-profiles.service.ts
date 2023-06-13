import { Inject, Injectable } from '@nestjs/common'

import { BaseService, IBaseModel, IBaseService } from '../../../common'
import { IGoogleProfileModel } from '../../../models'

import { GoogleProfilesRepository } from './google-profiles.repository'

export type IUpsertProfile = Omit<IGoogleProfileModel, keyof IBaseModel | `data` | `consumerId`>

@Injectable()
export class GoogleProfilesService
  extends BaseService<IGoogleProfileModel, GoogleProfilesRepository>
  implements IBaseService<IGoogleProfileModel, GoogleProfilesRepository>
{
  constructor(@Inject(GoogleProfilesRepository) repository: GoogleProfilesRepository) {
    super(repository)
  }

  async upsertGoogleProfile(consumerId: string, dto: IUpsertProfile): Promise<IGoogleProfileModel> {
    const [exist] = await this.repository.find({ filter: { consumerId } })
    const data = { ...dto, consumerId, data: JSON.stringify(dto) }
    const result = exist == null ? await this.repository.create(data) : await this.repository.updateById(exist.id, data)
    return result
  }
}
