import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'

import { IGoogleProfileModel, TableName } from '@wirebill/shared-common/models'

import { BaseRepository } from '../../../common'

@Injectable()
export class AdminGoogleProfileDetailsRepository extends BaseRepository<IGoogleProfileModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TableName.GoogleProfileDetails)
  }
}
