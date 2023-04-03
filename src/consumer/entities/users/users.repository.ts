import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'
import { BaseRepository } from '../../../common/base.repository'
import { TableName, IUserModel } from '../../../models'

@Injectable()
export class UsersRepository extends BaseRepository<IUserModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TableName.Users)
  }
}
