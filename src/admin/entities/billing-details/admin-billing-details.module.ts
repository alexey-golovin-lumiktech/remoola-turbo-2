import { Module } from '@nestjs/common'

import { AdminBillingDetailsController } from './admin-billing-details.controller'
import { AdminBillingDetailsRepository } from './admin-billing-details.repository'
import { AdminBillingDetailsService } from './admin-billing-details.service'

@Module({
  controllers: [AdminBillingDetailsController],
  providers: [AdminBillingDetailsService, AdminBillingDetailsRepository],
  exports: [AdminBillingDetailsService, AdminBillingDetailsRepository],
})
export class AdminBillingDetailsModule {}
