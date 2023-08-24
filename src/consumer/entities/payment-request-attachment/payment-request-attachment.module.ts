import { Module } from '@nestjs/common'

import { ConsumerResourceModule } from '../consumer-resource/consumer-resource.module'

import { PaymentRequestAttachmentRepository } from './payment-request-attachment.repository'
import { PaymentRequestAttachmentService } from './payment-request-attachment.service'

@Module({
  imports: [ConsumerResourceModule],
  providers: [PaymentRequestAttachmentService, PaymentRequestAttachmentRepository],
  exports: [PaymentRequestAttachmentService, PaymentRequestAttachmentRepository],
})
export class PaymentRequestAttachmentModule {}
