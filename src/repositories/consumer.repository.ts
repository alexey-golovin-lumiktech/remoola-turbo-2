import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectKnex, Knex } from 'nestjs-knex'

import { IConsumerModel, TableName } from '@wirebill/shared-common/models'

import { BaseRepository } from '../common'

@Injectable()
export class ConsumerRepository extends BaseRepository<IConsumerModel> {
  constructor(@InjectKnex() knex: Knex, private readonly configService: ConfigService) {
    super(knex, TableName.Consumer)
  }
}
