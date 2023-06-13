import { Module } from '@nestjs/common'

import { AddressDetailsRepository } from './address-details.repository'
import { AddressDetailsService } from './address-details.service'

@Module({
  providers: [AddressDetailsRepository, AddressDetailsService],
  exports: [AddressDetailsRepository, AddressDetailsService],
})
export class AddressDetailsModule {}
