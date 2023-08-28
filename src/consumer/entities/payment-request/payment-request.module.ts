import { forwardRef, Module } from '@nestjs/common'

import { ConsumerModule } from '../consumer/consumer.module'
import { PaymentRequestAttachmentModule } from '../payment-request-attachment/payment-request-attachment.module'

import { PaymentRequestRepository } from './payment-request.repository'
import { PaymentRequestService } from './payment-request.service'

@Module({
  imports: [PaymentRequestAttachmentModule, forwardRef(() => ConsumerModule)],
  providers: [PaymentRequestRepository, PaymentRequestService],
  exports: [PaymentRequestRepository, PaymentRequestService],
})
export class PaymentRequestModule {}
