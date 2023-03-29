import { Module } from '@nestjs/common'
import { GoogleProfilesController } from './google-profiles.controller'
import { GoogleProfilesService } from './google-profiles.service'

@Module({
  controllers: [GoogleProfilesController],
  providers: [GoogleProfilesService]
})
export class GoogleProfilesModule {}
