import { forwardRef, Module } from '@nestjs/common'

import { PaymentRequestRepository } from '../../../repositories'
import { ConsumerModule } from '../consumer/consumer.module'
import { PaymentRequestAttachmentModule } from '../payment-request-attachment/payment-request-attachment.module'
import { TransactionModule } from '../transaction/transaction.module'

import { PaymentRequestService } from './payment-request.service'

@Module({
  imports: [
    forwardRef(() => PaymentRequestAttachmentModule), //
    forwardRef(() => ConsumerModule),
    forwardRef(() => TransactionModule),
  ],
  providers: [PaymentRequestRepository, PaymentRequestService],
  exports: [PaymentRequestRepository, PaymentRequestService],
})
export class PaymentRequestModule {}
