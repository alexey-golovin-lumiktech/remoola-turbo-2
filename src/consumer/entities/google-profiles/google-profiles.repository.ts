import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'

import { BaseRepository } from 'src/common'
import { IGoogleProfileModel, TableName } from 'src/models'

@Injectable()
export class GoogleProfilesRepository extends BaseRepository<IGoogleProfileModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TableName.GoogleProfiles)
  }
}
