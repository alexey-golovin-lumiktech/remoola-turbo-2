import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'

import { IAdminModel, TableName } from '@wirebill/shared-common/models'

import { BaseRepository } from '@-/common'

@Injectable()
export class AdminRepository extends BaseRepository<IAdminModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TableName.Admin)
  }
}
