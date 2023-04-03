import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'
import { BaseRepository } from '../../../common/base.repository'
import { TableName, IAdminModel } from '../../../models'

@Injectable()
export class AdminsRepository extends BaseRepository<IAdminModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TableName.Admins)
  }
}
