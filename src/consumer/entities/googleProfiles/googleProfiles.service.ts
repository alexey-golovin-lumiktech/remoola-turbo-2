import { Inject, Injectable } from '@nestjs/common'

import { BaseService } from '../../../common/base.service'
import { IGoogleProfileModel } from '../../../models'

import { GoogleProfilesRepository } from './googleProfiles.repository'

@Injectable()
export class GoogleProfilesService extends BaseService<IGoogleProfileModel, GoogleProfilesRepository> {
  constructor(@Inject(GoogleProfilesRepository) googleProfileRepository: GoogleProfilesRepository) {
    super(googleProfileRepository)
  }
}
