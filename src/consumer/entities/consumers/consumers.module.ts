import { Module } from '@nestjs/common'

import { GoogleProfilesModule } from '../google-profiles/google-profiles.module'

import { ConsumersController } from './consumers.controller'
import { ConsumersRepository } from './consumers.repository'
import { ConsumersService } from './consumers.service'

@Module({
  imports: [GoogleProfilesModule],
  controllers: [ConsumersController],
  providers: [ConsumersService, ConsumersRepository],
  exports: [ConsumersService, ConsumersRepository]
})
export class ConsumersModule {}
