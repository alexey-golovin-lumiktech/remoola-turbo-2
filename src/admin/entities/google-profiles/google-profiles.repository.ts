import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'
import { BaseRepository } from '../../../common/base.repository'
import { IGoogleProfileModel, TableName } from '../../../models'

@Injectable()
export class GoogleProfilesRepository extends BaseRepository<IGoogleProfileModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TableName.GoogleProfiles)
  }
}
