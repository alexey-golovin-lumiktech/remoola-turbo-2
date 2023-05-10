import { Module } from '@nestjs/common'

import { GoogleProfilesModule } from '../googleProfiles/googleProfiles.module'

import { consumersController } from './consumers.controller'
import { ConsumersRepository } from './consumers.repository'
import { ConsumersService } from './consumers.service'

@Module({
  imports: [GoogleProfilesModule],
  controllers: [consumersController],
  providers: [ConsumersService, ConsumersRepository],
  exports: [ConsumersService, ConsumersRepository]
})
export class ConsumersModule {}
