import { Inject, Injectable } from '@nestjs/common'

import { IGoogleProfileDetailsModel } from '@wirebill/shared-common/models'

import { BaseService } from '../../../common'
import { GoogleProfileDetailsRepository } from '../../../repositories'

@Injectable()
export class AdminGoogleProfileDetailsService extends BaseService<IGoogleProfileDetailsModel, GoogleProfileDetailsRepository> {
  constructor(@Inject(GoogleProfileDetailsRepository) repository: GoogleProfileDetailsRepository) {
    super(repository)
  }
}
