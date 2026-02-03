import { Module } from '@nestjs/common';

import { AdminAdminsController } from './admin-admins.controller';
import { providers } from './providers';
import { MailingModule } from '../../../shared/mailing.module';

@Module({
  imports: [MailingModule],
  controllers: [AdminAdminsController],
  providers: [...providers],
  exports: [...providers],
})
export class AdminAdminsModule {}
