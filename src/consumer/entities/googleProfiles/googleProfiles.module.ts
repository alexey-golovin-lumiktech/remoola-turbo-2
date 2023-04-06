import { Module } from '@nestjs/common'
import { GoogleProfilesController } from './googleProfiles.controller'
import { GoogleProfilesService } from './googleProfiles.service'
import { GoogleProfilesRepository } from './googleProfiles.repository'

@Module({
  controllers: [GoogleProfilesController],
  providers: [GoogleProfilesService, GoogleProfilesRepository],
  exports: [GoogleProfilesService, GoogleProfilesRepository]
})
export class GoogleProfilesModule {}
