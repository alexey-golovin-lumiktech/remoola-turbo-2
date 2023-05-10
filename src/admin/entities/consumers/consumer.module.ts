import { Module } from '@nestjs/common'

import { GoogleProfilesModule } from '../googleProfiles/googleProfiles.module'

import { AdminConsumersController } from './consumer.controller'
import { AdminConsumersRepository } from './consumer.repository'
import { AdminConsumersService } from './consumer.service'

@Module({
  imports: [GoogleProfilesModule],
  controllers: [AdminConsumersController],
  providers: [AdminConsumersService, AdminConsumersRepository],
  exports: [AdminConsumersService, AdminConsumersRepository]
})
export class ConsumersModule {}
