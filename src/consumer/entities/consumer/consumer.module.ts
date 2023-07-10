import { Module } from '@nestjs/common'

import { AddressDetailsModule } from '../address-details/address-details.module'
import { AddressDetailsRepository } from '../address-details/address-details.repository'
import { AddressDetailsService } from '../address-details/address-details.service'
import { BillingDetailsModule } from '../billing-details/billing-details.module'
import { GoogleProfileDetailsModule } from '../google-profile-details/google-profile-details.module'
import { OrganizationDetailsModule } from '../organization-details/organization-details.module'
import { OrganizationDetailsRepository } from '../organization-details/organization-details.repository'
import { OrganizationDetailsService } from '../organization-details/organization-details.service'
import { PaymentRequestModule } from '../payment-request/payment-request.module'
import { PaymentRequestService } from '../payment-request/payment-request.service'
import { PersonalDetailsModule } from '../personal-details/personal-details.module'
import { PersonalDetailsRepository } from '../personal-details/personal-details.repository'
import { PersonalDetailsService } from '../personal-details/personal-details.service'

import { ConsumerController } from './consumer.controller'
import { ConsumerRepository } from './consumer.repository'
import { ConsumerService } from './consumer.service'

@Module({
  imports: [
    GoogleProfileDetailsModule,
    BillingDetailsModule,
    AddressDetailsModule,
    OrganizationDetailsModule,
    PersonalDetailsModule,
    PaymentRequestModule,
  ],
  controllers: [ConsumerController],
  providers: [
    ConsumerService,
    ConsumerRepository,
    AddressDetailsRepository,
    AddressDetailsService,
    PersonalDetailsRepository,
    PersonalDetailsService,
    OrganizationDetailsRepository,
    OrganizationDetailsService,
    PaymentRequestService,
  ],
  exports: [
    ConsumerService,
    ConsumerRepository,
    AddressDetailsRepository,
    AddressDetailsService,
    PersonalDetailsRepository,
    PersonalDetailsService,
    OrganizationDetailsRepository,
    OrganizationDetailsService,
    PaymentRequestService,
  ],
})
export class ConsumerModule {}
