import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { InjectKnex, Knex } from 'nestjs-knex'

import { TableName } from '@wirebill/shared-common/models'

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name)

  constructor(@InjectKnex() private readonly knex: Knex) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleUnverifiedConsumers(): Promise<void> {
    try {
      const deletedConsumers = await this.knex.from(TableName.Consumer).where(`verified`, false).del().returning(`*`)

      if (deletedConsumers.length > 0) {
        this.logger.log(`Deleted unverified consumers: ${JSON.stringify(deletedConsumers)}`)
      } else {
        this.logger.log(`No unverified consumers found to delete.`)
      }
    } catch (error: any) {
      this.logger.error(`Error deleting unverified consumers: ${error.message}`, error.stack)
    }
  }

  @Cron(CronExpression.EVERY_2_HOURS)
  async handleExpiredResetPasswordRecords(): Promise<void> {
    try {
      const deletedRecords = await this.knex.from(TableName.ResetPassword).where(`expired_at`, `<=`, new Date()).del().returning(`*`)

      if (deletedRecords.length > 0) {
        this.logger.log(`Deleted expired reset password records: ${JSON.stringify(deletedRecords)}`)
      } else {
        this.logger.log(`No expired reset password records found to delete.`)
      }
    } catch (error: any) {
      this.logger.error(`Error deleting expired reset password records: ${error.message}`, error.stack)
    }
  }
}
