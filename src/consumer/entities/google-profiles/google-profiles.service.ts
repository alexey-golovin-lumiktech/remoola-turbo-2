import { Inject, Injectable } from '@nestjs/common'
import { BaseService } from 'src/common/base.service'
import { IGoogleProfileModel } from 'src/models'
import { GoogleProfilesRepository } from './google-profiles.repository'

@Injectable()
export class GoogleProfilesService extends BaseService<IGoogleProfileModel, GoogleProfilesRepository> {
  constructor(@Inject(GoogleProfilesRepository) googleProfileRepository: GoogleProfilesRepository) {
    super(googleProfileRepository)
  }
}
