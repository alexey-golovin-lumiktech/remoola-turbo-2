import { Inject, Injectable } from '@nestjs/common'

import { GoogleProfilesRepository } from './google-profiles.repository'

import { BaseService } from 'src/common'
import { IGoogleProfileModel } from 'src/models'

@Injectable()
export class GoogleProfilesService extends BaseService<IGoogleProfileModel, GoogleProfilesRepository> {
  constructor(@Inject(GoogleProfilesRepository) repository: GoogleProfilesRepository) {
    super(repository)
  }
}
