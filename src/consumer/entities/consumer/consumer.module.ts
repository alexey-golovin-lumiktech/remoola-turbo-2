import { forwardRef, Module } from '@nestjs/common'

import { AwsS3Module } from '../../../common-shared-modules/aws-s3/aws-s3.module'
import { ResourceModule } from '../../../common-shared-modules/resource/resource.module'
import { ConsumerRepository } from '../../../repositories'
import { AddressDetailsModule } from '../address-details/address-details.module'
import { BillingDetailsModule } from '../billing-details/billing-details.module'
import { ConsumerResourceModule } from '../consumer-resource/consumer-resource.module'
import { ContactModule } from '../contact/contact.module'
import { CreditCardModule } from '../credit-card/credit-card.module'
import { OrganizationDetailsModule } from '../organization-details/organization-details.module'
import { PaymentRequestAttachmentModule } from '../payment-request-attachment/payment-request-attachment.module'
import { TransactionModule } from '../transaction/transaction.module'

import { ConsumerController } from './consumer.controller'
import { ConsumerService } from './consumer.service'

@Module({
  imports: [
    forwardRef(() => AwsS3Module),
    forwardRef(() => ResourceModule),
    forwardRef(() => AddressDetailsModule),
    forwardRef(() => BillingDetailsModule),
    forwardRef(() => ConsumerResourceModule),
    forwardRef(() => ContactModule),
    forwardRef(() => CreditCardModule),
    forwardRef(() => OrganizationDetailsModule),
    forwardRef(() => PaymentRequestAttachmentModule),
    forwardRef(() => TransactionModule),
  ],
  controllers: [ConsumerController],
  providers: [ConsumerRepository, ConsumerService],
  exports: [ConsumerRepository, ConsumerService],
})
export class ConsumerModule {}
