import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'

import { BaseRepository } from '../../../common/base.repository'
import { IConsumerModel, TableName } from '../../../models'

@Injectable()
export class ConsumersRepository extends BaseRepository<IConsumerModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TableName.Consumers)
  }
}
