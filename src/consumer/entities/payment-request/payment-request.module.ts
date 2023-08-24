import { Module } from '@nestjs/common'

import { ConsumerResourceModule } from '../consumer-resource/consumer-resource.module'
import { PaymentRequestAttachmentModule } from '../payment-request-attachment/payment-request-attachment.module'

import { PaymentRequestRepository } from './payment-request.repository'
import { PaymentRequestService } from './payment-request.service'

@Module({
  imports: [ConsumerResourceModule, PaymentRequestAttachmentModule],
  providers: [PaymentRequestRepository, PaymentRequestService],
  exports: [PaymentRequestRepository, PaymentRequestService],
})
export class PaymentRequestModule {}
