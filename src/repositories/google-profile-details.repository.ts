import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'

import { IGoogleProfileDetailsModel, TableName } from '@wirebill/shared-common/models'

import { BaseRepository } from '../common'

@Injectable()
export class GoogleProfileDetailsRepository extends BaseRepository<IGoogleProfileDetailsModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TableName.GoogleProfileDetails)
  }
}
