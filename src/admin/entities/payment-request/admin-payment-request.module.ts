import { forwardRef, Module } from '@nestjs/common'

import { AdminConsumerModule } from '../consumer/admin-consumer.module'

import { AdminPaymentRequestController } from './admin-payment-request.controller'
import { AdminPaymentRequestRepository } from './admin-payment-request.repository'
import { AdminPaymentRequestService } from './admin-payment-request.service'

@Module({
  imports: [forwardRef(() => AdminConsumerModule)],
  controllers: [AdminPaymentRequestController],
  providers: [AdminPaymentRequestRepository, AdminPaymentRequestService],
  exports: [AdminPaymentRequestRepository, AdminPaymentRequestService],
})
export class AdminPaymentRequestModule {}
