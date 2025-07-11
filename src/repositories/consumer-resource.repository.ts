import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'

import { IConsumerResourceModel, TableName } from '@wirebill/shared-common/models'

import { BaseRepository } from '@-/common'

@Injectable()
export class ConsumerResourceRepository extends BaseRepository<IConsumerResourceModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TableName.ConsumerResource)
  }
}
