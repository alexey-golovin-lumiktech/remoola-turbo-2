import { Module } from '@nestjs/common'
import { GoogleProfilesController } from './google-profiles.controller'
import { GoogleProfilesService } from './google-profiles.service'
import { GoogleProfilesRepository } from './google-profiles.repository'

@Module({
  controllers: [GoogleProfilesController],
  providers: [GoogleProfilesService, GoogleProfilesRepository],
  exports: [GoogleProfilesService, GoogleProfilesRepository]
})
export class GoogleProfilesModule {}
