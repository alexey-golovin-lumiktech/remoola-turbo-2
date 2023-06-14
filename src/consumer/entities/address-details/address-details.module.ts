import { forwardRef, Module } from '@nestjs/common'

import { ConsumerModule } from '../consumer/consumer.module'

import { AddressDetailsRepository } from './address-details.repository'
import { AddressDetailsService } from './address-details.service'

@Module({
  imports: [forwardRef(() => ConsumerModule)],
  providers: [AddressDetailsRepository, AddressDetailsService],
  exports: [AddressDetailsRepository, AddressDetailsService],
})
export class AddressDetailsModule {}
