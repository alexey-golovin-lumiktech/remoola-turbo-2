import { Module } from '@nestjs/common'

import { AddressDetailsRepository } from '@-/repositories'

import { AdminAddressDetailsController } from './admin-address-details.controller'
import { AdminAddressDetailsService } from './admin-address-details.service'

@Module({
  controllers: [AdminAddressDetailsController],
  providers: [AddressDetailsRepository, AdminAddressDetailsService],
  exports: [AddressDetailsRepository, AdminAddressDetailsService],
})
export class AdminAddressDetailsModule {}
