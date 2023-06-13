import { Inject, Injectable } from '@nestjs/common'
import { CONSUMER } from 'src/dtos'

import { BaseService } from '../../../common'
import { IPersonalDetailsModel } from '../../../models'

import { PersonalDetailsRepository } from './personal-details.repository'

@Injectable()
export class PersonalDetailsService extends BaseService<IPersonalDetailsModel, PersonalDetailsRepository> {
  constructor(@Inject(PersonalDetailsRepository) repository: PersonalDetailsRepository) {
    super(repository)
  }

  async upsertPersonalDetails(personalDetailsBody: CONSUMER.PersonalDetails) {
    console.log(JSON.stringify({ personalDetailsBody }, null, 2))
    return null
  }
}
