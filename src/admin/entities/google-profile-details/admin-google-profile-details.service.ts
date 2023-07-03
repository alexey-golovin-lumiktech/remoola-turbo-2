import { Inject, Injectable } from '@nestjs/common'

import { IGoogleProfileModel } from '@wirebill/shared-common/models'

import { BaseService } from '../../../common'

import { AdminGoogleProfileDetailsRepository } from './admin-google-profile-details.repository'

@Injectable()
export class AdminGoogleProfileDetailsService extends BaseService<IGoogleProfileModel, AdminGoogleProfileDetailsRepository> {
  constructor(@Inject(AdminGoogleProfileDetailsRepository) repository: AdminGoogleProfileDetailsRepository) {
    super(repository)
  }
}
