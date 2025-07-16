import { Inject, Injectable } from '@nestjs/common'

import { IPersonalDetailsModel } from '@wirebill/shared-common/models'

import { BaseService } from '../../../common'
import { PersonalDetailsRepository } from '../../../repositories'

@Injectable()
export class AdminPersonalDetailsService extends BaseService<IPersonalDetailsModel, PersonalDetailsRepository> {
  constructor(@Inject(PersonalDetailsRepository) repository: PersonalDetailsRepository) {
    super(repository)
  }
}
