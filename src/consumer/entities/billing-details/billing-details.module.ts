import { Module } from '@nestjs/common'

import { BillingDetailsController } from './billing-details.controller'
import { BillingDetailsRepository } from './billing-details.repository'
import { BillingDetailsService } from './billing-details.service'

@Module({
  controllers: [BillingDetailsController],
  providers: [BillingDetailsService, BillingDetailsRepository],
  exports: [BillingDetailsService, BillingDetailsRepository]
})
export class BillingDetailsModule {}
