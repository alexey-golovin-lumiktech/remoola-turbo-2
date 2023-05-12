import { Inject, Injectable } from '@nestjs/common'

import { BaseService } from '../../../common'
import { IGoogleProfileModel } from '../../../models'

import { GoogleProfilesRepository } from './google-profiles.repository'

@Injectable()
export class GoogleProfilesService extends BaseService<IGoogleProfileModel, GoogleProfilesRepository> {
  constructor(@Inject(GoogleProfilesRepository) repository: GoogleProfilesRepository) {
    super(repository)
  }
}
