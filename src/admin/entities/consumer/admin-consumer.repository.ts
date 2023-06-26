import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'

import { BaseRepository } from '../../../common'
import { IConsumerModel, TableName } from '../../../models'

@Injectable()
export class AdminConsumerRepository extends BaseRepository<IConsumerModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TableName.Consumer)
  }
}
