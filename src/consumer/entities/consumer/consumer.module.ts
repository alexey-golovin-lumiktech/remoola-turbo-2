import { forwardRef, Module } from '@nestjs/common'

import { AddressDetailsModule } from '../address-details/address-details.module'
import { AddressDetailsRepository } from '../address-details/address-details.repository'
import { AddressDetailsService } from '../address-details/address-details.service'
import { BillingDetailsModule } from '../billing-details/billing-details.module'
import { GoogleProfilesModule } from '../google-profiles/google-profiles.module'
import { InvoiceModule } from '../invoice/invoice.module'
import { OrganizationDetailsModule } from '../organization-details/organization-details.module'
import { OrganizationDetailsRepository } from '../organization-details/organization-details.repository'
import { OrganizationDetailsService } from '../organization-details/organization-details.service'
import { PersonalDetailsModule } from '../personal-details/personal-details.module'
import { PersonalDetailsRepository } from '../personal-details/personal-details.repository'
import { PersonalDetailsService } from '../personal-details/personal-details.service'

import { ConsumerController } from './consumer.controller'
import { ConsumerRepository } from './consumer.repository'
import { ConsumerService } from './consumer.service'

@Module({
  imports: [
    GoogleProfilesModule,
    BillingDetailsModule,
    AddressDetailsModule,
    OrganizationDetailsModule,
    PersonalDetailsModule,
    forwardRef(() => InvoiceModule),
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
  ],
})
export class ConsumerModule {}
