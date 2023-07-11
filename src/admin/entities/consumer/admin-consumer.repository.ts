import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'

import { IConsumerModel, TableName } from '@wirebill/shared-common/models'

import { BaseRepository } from '../../../common'

@Injectable()
export class AdminConsumerRepository extends BaseRepository<IConsumerModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TableName.Consumer)
  }
}
