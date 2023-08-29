import { Module } from '@nestjs/common'

import { ResourceModule } from '../../../common-shared-modules/resource/resource.module'
import { ConsumerResourceModule } from '../consumer-resource/consumer-resource.module'

import { PaymentRequestAttachmentRepository } from './payment-request-attachment.repository'
import { PaymentRequestAttachmentService } from './payment-request-attachment.service'

@Module({
  imports: [ConsumerResourceModule, ResourceModule],
  providers: [PaymentRequestAttachmentService, PaymentRequestAttachmentRepository],
  exports: [PaymentRequestAttachmentService, PaymentRequestAttachmentRepository],
})
export class PaymentRequestAttachmentModule {}
