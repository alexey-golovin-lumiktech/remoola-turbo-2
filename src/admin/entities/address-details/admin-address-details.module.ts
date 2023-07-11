import { Module } from '@nestjs/common'

import { AdminAddressDetailsController } from './admin-address-details.controller'
import { AdminAddressDetailsRepository } from './admin-address-details.repository'
import { AdminAddressDetailsService } from './admin-address-details.service'

@Module({
  controllers: [AdminAddressDetailsController],
  providers: [AdminAddressDetailsService, AdminAddressDetailsRepository],
  exports: [AdminAddressDetailsService, AdminAddressDetailsRepository],
})
export class AdminAddressDetailsModule {}
