import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'
import { BaseRepository } from 'src/common/base.repository'
import { TableName } from 'src/models'
import { IUserModel } from 'src/models/user.model'

@Injectable()
export class UsersRepository extends BaseRepository<IUserModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TableName.Users)
  }
}
