import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'

import { BaseRepository } from '../../../common'
import { IConsumerModel, TABLES } from '../../../models'

@Injectable()
export class AdminConsumersRepository extends BaseRepository<IConsumerModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TABLES.Consumers)
  }
}
