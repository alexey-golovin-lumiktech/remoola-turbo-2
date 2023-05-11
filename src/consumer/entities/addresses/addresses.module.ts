import { Module } from '@nestjs/common'

import { AddressesRepository } from './addresses.repository'
import { AddressesService } from './addresses.service'

@Module({
  providers: [AddressesService, AddressesRepository],
  exports: [AddressesService, AddressesRepository]
})
export class AddressesModule {}
