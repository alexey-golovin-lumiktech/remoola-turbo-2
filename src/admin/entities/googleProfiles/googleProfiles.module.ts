import { Module } from '@nestjs/common'
import { GoogleProfilesController } from './googleProfiles.controller'
import { GoogleProfilesRepository } from './googleProfiles.repository'
import { GoogleProfilesService } from './googleProfiles.service'

@Module({
  controllers: [GoogleProfilesController],
  providers: [GoogleProfilesService, GoogleProfilesRepository],
  exports: [GoogleProfilesService, GoogleProfilesRepository]
})
export class GoogleProfilesModule {}
