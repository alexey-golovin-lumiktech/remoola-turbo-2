import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'

import { BaseRepository } from '../../../common/base.repository'
import { IAdminModel, TableName } from '../../../models'

@Injectable()
export class AdminsRepository extends BaseRepository<IAdminModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TableName.Admins)
  }
}
