import { Module } from '@nestjs/common';

import { AdminAdminsController } from './admin-admins.controller';
import { providers } from './providers';
import { ConsumerPaymentsModule } from '../../../consumer/modules/payments/consumer-payments.module';
import { MailingModule } from '../../../shared/mailing.module';

@Module({
  imports: [MailingModule, ConsumerPaymentsModule],
  controllers: [AdminAdminsController],
  providers: [...providers],
  exports: [...providers],
})
export class AdminAdminsModule {}
