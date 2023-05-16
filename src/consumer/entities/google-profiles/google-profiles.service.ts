import { Inject, Injectable } from '@nestjs/common'

import { GoogleProfilesRepository } from './google-profiles.repository'

import { BaseService } from 'src/common'
import { IBaseModel, IGoogleProfileModel } from 'src/models'

export type IUpsertProfile = Omit<IGoogleProfileModel, keyof IBaseModel | `data` | `consumerId`>

@Injectable()
export class GoogleProfilesService extends BaseService<IGoogleProfileModel, GoogleProfilesRepository> {
  constructor(@Inject(GoogleProfilesRepository) googleProfileRepository: GoogleProfilesRepository) {
    super(googleProfileRepository)
  }

  async upsertGoogleProfile(consumerId: string, dto: IUpsertProfile): Promise<IGoogleProfileModel> {
    const [exist] = await this.repository.find({ filter: { consumerId } })
    const data = { ...dto, consumerId, data: JSON.stringify(dto) }
    const result = exist == null ? await this.repository.create(data) : await this.repository.updateById(exist.id, data)
    return result
  }
}
