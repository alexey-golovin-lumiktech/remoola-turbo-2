import { Module } from '@nestjs/common'

import { MailingModule } from './mailing/mailing.module'
import { TasksModule } from './tasks/tasks.module'

@Module({ imports: [MailingModule, TasksModule] })
export class SharedModulesModule {}
