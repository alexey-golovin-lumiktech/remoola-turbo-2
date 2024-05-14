import { Module } from '@nestjs/common'

import { BillingDetailsRepository } from '@-/repositories'

import { AdminBillingDetailsController } from './admin-billing-details.controller'
import { AdminBillingDetailsService } from './admin-billing-details.service'

@Module({
  controllers: [AdminBillingDetailsController],
  providers: [BillingDetailsRepository, AdminBillingDetailsService],
  exports: [BillingDetailsRepository, AdminBillingDetailsService],
})
export class AdminBillingDetailsModule {}
