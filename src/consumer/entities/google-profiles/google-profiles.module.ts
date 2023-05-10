import { Module } from '@nestjs/common'

import { GoogleProfilesController } from './google-profiles.controller'
import { GoogleProfilesRepository } from './google-profiles.repository'
import { GoogleProfilesService } from './google-profiles.service'

@Module({
  controllers: [GoogleProfilesController],
  providers: [GoogleProfilesService, GoogleProfilesRepository],
  exports: [GoogleProfilesService, GoogleProfilesRepository]
})
export class GoogleProfilesModule {}
