import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'

import { IAdminResourceModel, TableName } from '@wirebill/shared-common/models'

import { BaseRepository } from '../../../common'

@Injectable()
export class AdminResourceRepository extends BaseRepository<IAdminResourceModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TableName.AdminResource)
  }
}
