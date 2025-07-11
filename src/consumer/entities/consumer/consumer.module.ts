import { forwardRef, Module } from '@nestjs/common'

import { AwsS3Module } from '@-/common-shared-modules/aws-s3/aws-s3.module'
import { ResourceModule } from '@-/common-shared-modules/resource/resource.module'
import { ConsumerRepository } from '@-/repositories'

import { BillingDetailsModule } from '../billing-details/billing-details.module'
import { ConsumerResourceModule } from '../consumer-resource/consumer-resource.module'
import { PaymentRequestAttachmentModule } from '../payment-request-attachment/payment-request-attachment.module'

import { ConsumerController } from './consumer.controller'
import { ConsumerService } from './consumer.service'

@Module({
  imports: [
    forwardRef(() => AwsS3Module),
    forwardRef(() => ResourceModule),
    forwardRef(() => BillingDetailsModule),
    forwardRef(() => ConsumerResourceModule),
    forwardRef(() => PaymentRequestAttachmentModule),
  ],
  controllers: [ConsumerController],
  providers: [ConsumerRepository, ConsumerService],
  exports: [ConsumerRepository, ConsumerService],
})
export class ConsumerModule {}
