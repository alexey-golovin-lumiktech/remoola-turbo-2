import { forwardRef, Module } from '@nestjs/common'

import { AddressDetailsRepository } from '@-/repositories'

import { ConsumerModule } from '../consumer/consumer.module'

import { AddressDetailsController } from './address-details.controller'
import { AddressDetailsService } from './address-details.service'

@Module({
  imports: [forwardRef(() => ConsumerModule)],
  controllers: [AddressDetailsController],
  providers: [AddressDetailsRepository, AddressDetailsService],
  exports: [AddressDetailsRepository, AddressDetailsService],
})
export class AddressDetailsModule {}
