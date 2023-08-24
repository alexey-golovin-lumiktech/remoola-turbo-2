import { Module } from '@nestjs/common'
import { AwsS3Module } from 'src/common-shared-modules/aws-s3/aws-s3.module'
import { ResourceModule } from 'src/common-shared-modules/resource/resource.module'

import { ConsumerResourceModule } from '../consumer-resource/consumer-resource.module'

import { PaymentRequestAttachmentRepository } from './payment-request-attachment.repository'
import { PaymentRequestAttachmentService } from './payment-request-attachment.service'

@Module({
  imports: [AwsS3Module, ConsumerResourceModule, ResourceModule],
  providers: [PaymentRequestAttachmentService, PaymentRequestAttachmentRepository],
  exports: [PaymentRequestAttachmentService, PaymentRequestAttachmentRepository],
})
export class PaymentRequestAttachmentModule {}
