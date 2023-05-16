import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'

import { BaseRepository } from 'src/common'
import { IAdminModel, TableName } from 'src/models'

@Injectable()
export class AdminsRepository extends BaseRepository<IAdminModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TableName.Admins)
  }
}
