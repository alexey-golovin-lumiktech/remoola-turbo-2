import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'

import { BaseRepository } from '../../../common'
import { IGoogleProfileModel, TABLE_NAME } from '../../../models'

@Injectable()
export class GoogleProfilesRepository extends BaseRepository<IGoogleProfileModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TABLE_NAME.GoogleProfiles)
  }
}
