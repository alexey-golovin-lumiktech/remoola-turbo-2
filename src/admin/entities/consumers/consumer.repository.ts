import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'

import { BaseRepository } from 'src/common'
import { IConsumerModel, TableName } from 'src/models'

@Injectable()
export class AdminConsumersRepository extends BaseRepository<IConsumerModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TableName.Consumers)
  }
}
