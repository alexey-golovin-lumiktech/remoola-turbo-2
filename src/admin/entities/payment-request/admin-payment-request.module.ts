import { Module } from '@nestjs/common'

import { PaymentRequestRepository } from '../../../repositories'
import { AdminConsumerModule } from '../consumer/admin-consumer.module'

import { AdminPaymentRequestController } from './admin-payment-request.controller'
import { AdminPaymentRequestService } from './admin-payment-request.service'

@Module({
  imports: [AdminConsumerModule],
  controllers: [AdminPaymentRequestController],
  providers: [PaymentRequestRepository, AdminPaymentRequestService],
  exports: [PaymentRequestRepository, AdminPaymentRequestService],
})
export class AdminPaymentRequestModule {}
