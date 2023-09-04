import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'

import { IPersonalDetailsModel, TableName } from '@wirebill/shared-common/models'

import { BaseRepository } from '../common'

@Injectable()
export class PersonalDetailsRepository extends BaseRepository<IPersonalDetailsModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TableName.PersonalDetails)
  }
}
