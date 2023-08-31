import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'

import { ITransactionModel, TableName } from '@wirebill/shared-common/models'

import { BaseRepository } from '../../../common'

@Injectable()
export class AdminTransactionRepository extends BaseRepository<ITransactionModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TableName.Transaction)
  }
}
