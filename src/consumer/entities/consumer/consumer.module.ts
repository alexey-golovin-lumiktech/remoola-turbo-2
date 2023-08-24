import { Module } from '@nestjs/common'
import { AwsS3Module } from 'src/common-shared-modules/aws-s3/aws-s3.module'
import { ResourceModule } from 'src/common-shared-modules/resource/resource.module'

import { AddressDetailsModule } from '../address-details/address-details.module'
import { AddressDetailsRepository } from '../address-details/address-details.repository'
import { AddressDetailsService } from '../address-details/address-details.service'
import { BillingDetailsModule } from '../billing-details/billing-details.module'
import { ConsumerResourceModule } from '../consumer-resource/consumer-resource.module'
import { ConsumerResourceRepository } from '../consumer-resource/consumer-resource.repository'
import { ConsumerResourceService } from '../consumer-resource/consumer-resource.service'
import { ContactModule } from '../contact/contact.module'
import { ContactRepository } from '../contact/contact.repository'
import { ContactService } from '../contact/contact.service'
import { CreditCardModule } from '../credit-card/credit-card.module'
import { CreditCardRepository } from '../credit-card/credit-card.repository'
import { CreditCardService } from '../credit-card/credit-card.service'
import { GoogleProfileDetailsModule } from '../google-profile-details/google-profile-details.module'
import { OrganizationDetailsModule } from '../organization-details/organization-details.module'
import { OrganizationDetailsRepository } from '../organization-details/organization-details.repository'
import { OrganizationDetailsService } from '../organization-details/organization-details.service'
import { PaymentRequestModule } from '../payment-request/payment-request.module'
import { PaymentRequestRepository } from '../payment-request/payment-request.repository'
import { PaymentRequestService } from '../payment-request/payment-request.service'
import { PaymentRequestAttachmentModule } from '../payment-request-attachment/payment-request-attachment.module'
import { PaymentRequestAttachmentRepository } from '../payment-request-attachment/payment-request-attachment.repository'
import { PaymentRequestAttachmentService } from '../payment-request-attachment/payment-request-attachment.service'
import { PersonalDetailsModule } from '../personal-details/personal-details.module'
import { PersonalDetailsRepository } from '../personal-details/personal-details.repository'
import { PersonalDetailsService } from '../personal-details/personal-details.service'

import { ConsumerController } from './consumer.controller'
import { ConsumerRepository } from './consumer.repository'
import { ConsumerService } from './consumer.service'

@Module({
  imports: [
    AwsS3Module,
    ResourceModule,
    AddressDetailsModule,
    BillingDetailsModule,
    ConsumerResourceModule,
    ContactModule,
    CreditCardModule,
    GoogleProfileDetailsModule,
    OrganizationDetailsModule,
    PaymentRequestModule,
    PaymentRequestAttachmentModule,
    PersonalDetailsModule,
  ],
  controllers: [ConsumerController],
  providers: [
    AddressDetailsRepository,
    AddressDetailsService,
    ConsumerResourceRepository,
    ConsumerResourceService,
    ContactRepository,
    ContactService,
    CreditCardRepository,
    CreditCardService,
    OrganizationDetailsRepository,
    OrganizationDetailsService,
    PaymentRequestRepository,
    PaymentRequestService,
    PaymentRequestAttachmentRepository,
    PaymentRequestAttachmentService,
    PersonalDetailsRepository,
    PersonalDetailsService,
    ConsumerRepository,
    ConsumerService,
  ],
  exports: [
    AddressDetailsRepository,
    AddressDetailsService,
    ConsumerResourceRepository,
    ConsumerResourceService,
    ContactRepository,
    ContactService,
    CreditCardRepository,
    CreditCardService,
    OrganizationDetailsRepository,
    OrganizationDetailsService,
    PaymentRequestRepository,
    PaymentRequestService,
    PaymentRequestAttachmentRepository,
    PaymentRequestAttachmentService,
    PersonalDetailsRepository,
    PersonalDetailsService,
    ConsumerRepository,
    ConsumerService,
  ],
})
export class ConsumerModule {}
