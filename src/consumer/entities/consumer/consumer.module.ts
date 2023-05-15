import { forwardRef, Module } from '@nestjs/common'

import { BillingDetailsModule } from '../billing-details/billing-details.module'
import { GoogleProfilesModule } from '../google-profiles/google-profiles.module'
import { InvoicesModule } from '../invoices/invoices.module'

import { ConsumersController } from './consumer.controller'
import { ConsumersRepository } from './consumer.repository'
import { ConsumersService } from './consumer.service'

@Module({
  imports: [GoogleProfilesModule, BillingDetailsModule, forwardRef(() => InvoicesModule)],
  controllers: [ConsumersController],
  providers: [ConsumersService, ConsumersRepository],
  exports: [ConsumersService, ConsumersRepository],
})
export class ConsumersModule {}
