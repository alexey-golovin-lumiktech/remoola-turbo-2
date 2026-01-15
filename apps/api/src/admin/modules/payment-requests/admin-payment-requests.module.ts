import { Module } from '@nestjs/common';

import { AdminPaymentRequestsController } from './admin-payment-requests.controller';
import { providers } from './providers';

@Module({
  imports: [],
  controllers: [AdminPaymentRequestsController],
  providers: [...providers],
  exports: [...providers],
})
export class AdminPaymentRequestsModule {}
