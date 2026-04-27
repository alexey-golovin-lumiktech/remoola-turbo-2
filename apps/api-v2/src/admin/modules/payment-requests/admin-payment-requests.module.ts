import { Module } from '@nestjs/common';

import { AdminPaymentRequestsController } from './admin-payment-requests.controller';
import { providers } from './providers';
import { AdminAuthModule } from '../../../admin-auth/admin-auth.module';
import { MailingModule } from '../../../shared/mailing.module';

@Module({
  imports: [AdminAuthModule, MailingModule],
  controllers: [AdminPaymentRequestsController],
  providers: [...providers],
  exports: [...providers],
})
export class AdminPaymentRequestsModule {}
