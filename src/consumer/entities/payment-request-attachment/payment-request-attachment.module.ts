import { Module } from '@nestjs/common'

import { ResourceModule } from '../../../common-shared-modules/resource/resource.module'
import { PaymentRequestAttachmentRepository } from '../../../repositories'
import { ConsumerResourceModule } from '../consumer-resource/consumer-resource.module'

import { PaymentRequestAttachmentService } from './payment-request-attachment.service'

@Module({
  imports: [ConsumerResourceModule, ResourceModule],
  providers: [PaymentRequestAttachmentRepository, PaymentRequestAttachmentService],
  exports: [PaymentRequestAttachmentRepository, PaymentRequestAttachmentService],
})
export class PaymentRequestAttachmentModule {}
