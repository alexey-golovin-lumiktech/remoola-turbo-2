import { Module } from '@nestjs/common'

import { GoogleProfilesRepository } from './google-profiles.repository'
import { GoogleProfilesService } from './google-profiles.service'

@Module({
  providers: [GoogleProfilesService, GoogleProfilesRepository],
  exports: [GoogleProfilesService, GoogleProfilesRepository]
})
export class GoogleProfilesModule {}
