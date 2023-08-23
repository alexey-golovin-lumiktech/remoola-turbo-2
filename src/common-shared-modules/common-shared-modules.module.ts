import { Module } from '@nestjs/common'

import { AwsS3Module } from './aws-s3/aws-s3.module'
import { MailingModule } from './mailing/mailing.module'
import { TaskModule } from './task/task.module'

@Module({ imports: [MailingModule, TaskModule, AwsS3Module] })
export class CommonSharedModulesModule {}
