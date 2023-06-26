import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'

import { BaseRepository } from '../../../common'
import { IGoogleProfileModel, TableName } from '../../../models'

@Injectable()
export class AdminGoogleProfileDetailsRepository extends BaseRepository<IGoogleProfileModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TableName.GoogleProfileDetails)
  }
}
