import { forwardRef, Module } from '@nestjs/common'

import { AddressDetailsModule } from '../address-details/address-details.module'
import { AddressDetailsRepository } from '../address-details/address-details.repository'
import { AddressDetailsService } from '../address-details/address-details.service'
import { BillingDetailsModule } from '../billing-details/billing-details.module'
import { GoogleProfilesModule } from '../google-profiles/google-profiles.module'
import { InvoicesModule } from '../invoices/invoices.module'
import { OrganizationDetailsModule } from '../organization-details/organization-details.module'
import { OrganizationDetailsRepository } from '../organization-details/organization-details.repository'
import { OrganizationDetailsService } from '../organization-details/organization-details.service'
import { PersonalDetailsModule } from '../personal-details/personal-details.module'
import { PersonalDetailsRepository } from '../personal-details/personal-details.repository'
import { PersonalDetailsService } from '../personal-details/personal-details.service'

import { ConsumersController } from './consumer.controller'
import { ConsumersRepository } from './consumer.repository'
import { ConsumersService } from './consumer.service'

@Module({
  imports: [
    GoogleProfilesModule,
    BillingDetailsModule,
    AddressDetailsModule,
    OrganizationDetailsModule,
    PersonalDetailsModule,
    forwardRef(() => InvoicesModule),
  ],
  controllers: [ConsumersController],
  providers: [
    ConsumersService,
    ConsumersRepository,
    AddressDetailsRepository,
    AddressDetailsService,
    PersonalDetailsRepository,
    PersonalDetailsService,
    OrganizationDetailsRepository,
    OrganizationDetailsService,
  ],
  exports: [
    ConsumersService,
    ConsumersRepository,
    AddressDetailsRepository,
    AddressDetailsService,
    PersonalDetailsRepository,
    PersonalDetailsService,
    OrganizationDetailsRepository,
    OrganizationDetailsService,
  ],
})
export class ConsumersModule {}
