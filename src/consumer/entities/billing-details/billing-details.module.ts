import { Module } from '@nestjs/common'

import { AddressesModule } from '../addresses/addresses.module'

import { BillingDetailsRepository } from './billing-details.repository'
import { BillingDetailsService } from './billing-details.service'

@Module({
  imports: [AddressesModule],
  providers: [BillingDetailsService, BillingDetailsRepository],
  exports: [BillingDetailsService, BillingDetailsRepository],
})
export class BillingDetailsModule {}
