import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'

import { IOrganizationDetailsModel, TableName } from '@wirebill/shared-common/models'

import { BaseRepository } from '../../../common'

@Injectable()
export class AdminOrganizationDetailsRepository extends BaseRepository<IOrganizationDetailsModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TableName.OrganizationDetails)
  }
}
