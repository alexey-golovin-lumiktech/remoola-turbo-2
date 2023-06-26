import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { InjectKnex, Knex } from 'nestjs-knex'

import { TableName } from '../../models'

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name)

  constructor(@InjectKnex() private readonly knex: Knex) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleUnverifiedConsumers() {
    const deleted = await this.knex.from(TableName.Consumer).where(`verified`, false).del().returning(`*`)
    deleted.length == 0 || this.logger.log(deleted)
  }
}
