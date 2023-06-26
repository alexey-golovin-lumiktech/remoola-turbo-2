import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'

import { BaseRepository } from '../../../common'
import { IOrganizationDetailsModel, TableName } from '../../../models'

@Injectable()
export class OrganizationDetailsRepository extends BaseRepository<IOrganizationDetailsModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TableName.OrganizationDetails)
  }
}
