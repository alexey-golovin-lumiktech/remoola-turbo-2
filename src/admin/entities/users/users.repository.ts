import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'
import { BaseRepository } from '../../../common/base.repository'
import { TableName } from '../../../models'
import { IUserModel } from '../../../models/user.model'

@Injectable()
export class UsersRepository extends BaseRepository<IUserModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TableName.Users)
  }
}
