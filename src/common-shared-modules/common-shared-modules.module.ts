import { Module } from '@nestjs/common'

import { MailingModule } from './mailing/mailing.module'
import { TaskModule } from './task/task.module'

@Module({ imports: [MailingModule, TaskModule] })
export class CommonSharedModulesModule {}
