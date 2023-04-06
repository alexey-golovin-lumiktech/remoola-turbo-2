import { Module } from '@nestjs/common'
import { MailingModule } from './mailing/mailing.module'

@Module({
  imports: [MailingModule]
})
export class SharedModulesModule {}
