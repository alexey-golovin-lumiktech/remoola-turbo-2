import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectKnex, Knex } from 'nestjs-knex'

import { IConsumerModel, TableName } from '@wirebill/shared-common/models'

import { BaseRepository } from '../../../common'

@Injectable()
export class ConsumerRepository extends BaseRepository<IConsumerModel> {
  private readonly logger = new Logger(ConsumerRepository.name)
  private readonly mode: string

  constructor(@InjectKnex() knex: Knex, private readonly configService: ConfigService) {
    super(knex, TableName.Consumer)
    this.mode = this.configService.get<string>(`NODE_ENV`)
  }
}
