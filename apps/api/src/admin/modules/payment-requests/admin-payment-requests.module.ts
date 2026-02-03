import { Module } from '@nestjs/common';

import { AdminPaymentRequestsController } from './admin-payment-requests.controller';
import { providers } from './providers';
import { MailingModule } from '../../../shared/mailing.module';

@Module({
  imports: [MailingModule],
  controllers: [AdminPaymentRequestsController],
  providers: [...providers],
  exports: [...providers],
})
export class AdminPaymentRequestsModule {}
