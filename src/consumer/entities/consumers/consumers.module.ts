import { Module } from '@nestjs/common'

import { AddressesModule } from '../addresses/addresses.module'
import { BillingDetailsModule } from '../billing-details/billing-details.module'
import { GoogleProfilesModule } from '../google-profiles/google-profiles.module'

import { ConsumersController } from './consumers.controller'
import { ConsumersRepository } from './consumers.repository'
import { ConsumersService } from './consumers.service'

@Module({
  imports: [GoogleProfilesModule, BillingDetailsModule, AddressesModule],
  controllers: [ConsumersController],
  providers: [ConsumersService, ConsumersRepository],
  exports: [ConsumersService, ConsumersRepository],
})
export class ConsumersModule {}
