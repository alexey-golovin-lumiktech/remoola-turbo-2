import { forwardRef, Module } from '@nestjs/common'
import { AwsS3Module } from 'src/common-shared-modules/aws-s3/aws-s3.module'

import { ConsumerModule } from '../consumer/consumer.module'
import { IdentityResourceModule } from '../identity-resource/identity-resource.module'

import { PaymentRequestRepository } from './payment-request.repository'
import { PaymentRequestService } from './payment-request.service'

@Module({
  imports: [AwsS3Module, forwardRef(() => ConsumerModule), forwardRef(() => IdentityResourceModule)],
  providers: [PaymentRequestRepository, PaymentRequestService],
  exports: [PaymentRequestRepository, PaymentRequestService],
})
export class PaymentRequestModule {}
