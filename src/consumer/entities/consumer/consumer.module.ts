import { forwardRef, Module } from '@nestjs/common'
import { AwsS3Module } from 'src/common-shared-modules/aws-s3/aws-s3.module'
import { ResourceModule } from 'src/common-shared-modules/resource/resource.module'

import { AddressDetailsModule } from '../address-details/address-details.module'
import { BillingDetailsModule } from '../billing-details/billing-details.module'
import { ConsumerResourceModule } from '../consumer-resource/consumer-resource.module'
import { ContactModule } from '../contact/contact.module'
import { CreditCardModule } from '../credit-card/credit-card.module'
import { GoogleProfileDetailsModule } from '../google-profile-details/google-profile-details.module'
import { OrganizationDetailsModule } from '../organization-details/organization-details.module'
import { PaymentRequestModule } from '../payment-request/payment-request.module'
import { PaymentRequestAttachmentModule } from '../payment-request-attachment/payment-request-attachment.module'
import { PersonalDetailsModule } from '../personal-details/personal-details.module'

import { ConsumerController } from './consumer.controller'
import { ConsumerRepository } from './consumer.repository'
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
    forwardRef(() => GoogleProfileDetailsModule),
    forwardRef(() => OrganizationDetailsModule),
    forwardRef(() => PaymentRequestModule),
    forwardRef(() => PaymentRequestAttachmentModule),
    forwardRef(() => PersonalDetailsModule),
  ],
  controllers: [ConsumerController],
  providers: [ConsumerRepository, ConsumerService],
  exports: [ConsumerRepository, ConsumerService],
})
export class ConsumerModule {}
