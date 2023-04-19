import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { InjectKnex, Knex } from 'nestjs-knex'
import { TableName } from 'src/models'

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name)

  constructor(@InjectKnex() private readonly knex: Knex) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleUnverifiedUsers() {
    const deleted = await this.knex.from(TableName.Users).where(`verified`, false).del().returning(`*`)
    deleted.length == 0 || this.logger.log(deleted)
  }
}
