import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'

import { IResetPasswordModel, TableName } from '@wirebill/shared-common/models'

import { BaseRepository } from '../common'

@Injectable()
export class ResetPasswordRepository extends BaseRepository<IResetPasswordModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TableName.ResetPassword)
  }
}
