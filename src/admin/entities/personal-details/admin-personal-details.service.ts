import { Inject, Injectable } from '@nestjs/common'

import { IPersonalDetailsModel } from '@wirebill/shared-common/models'

import { PersonalDetailsRepository } from '@-/repositories'

import { BaseService } from '../../../common'

@Injectable()
export class AdminPersonalDetailsService extends BaseService<IPersonalDetailsModel, PersonalDetailsRepository> {
  constructor(@Inject(PersonalDetailsRepository) repository: PersonalDetailsRepository) {
    super(repository)
  }
}
