import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectKnex, Knex } from 'nestjs-knex'

import { BaseRepository } from '../../../common'
import { IConsumerModel, TableName } from '../../../models'

@Injectable()
export class ConsumerRepository extends BaseRepository<IConsumerModel> {
  private readonly logger = new Logger(ConsumerRepository.name)
  private readonly mode: string

  constructor(@InjectKnex() knex: Knex, private readonly configService: ConfigService) {
    super(knex, TableName.Consumer)
    this.mode = this.configService.get<string>(`NODE_ENV`)
  }
}
