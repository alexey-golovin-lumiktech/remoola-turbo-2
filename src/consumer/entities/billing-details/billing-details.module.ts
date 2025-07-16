import { Module } from '@nestjs/common'

import { BillingDetailsRepository } from '../../../repositories'

import { BillingDetailsService } from './billing-details.service'

@Module({
  providers: [BillingDetailsService, BillingDetailsRepository],
  exports: [BillingDetailsService, BillingDetailsRepository],
})
export class BillingDetailsModule {}
