import { Inject, Injectable } from '@nestjs/common'

import { BaseService } from '../../../common'
import { IGoogleProfileModel } from '../../../models'

import { AdminGoogleProfileDetailsRepository } from './admin-google-profile-details.repository'

@Injectable()
export class AdminGoogleProfileDetailsService extends BaseService<IGoogleProfileModel, AdminGoogleProfileDetailsRepository> {
  constructor(@Inject(AdminGoogleProfileDetailsRepository) repository: AdminGoogleProfileDetailsRepository) {
    super(repository)
  }
}
