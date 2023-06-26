import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'

import { BaseRepository } from '../../../common'
import { IPersonalDetailsModel, TableName } from '../../../models'

@Injectable()
export class PersonalDetailsRepository extends BaseRepository<IPersonalDetailsModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TableName.PersonalDetails)
  }
}
