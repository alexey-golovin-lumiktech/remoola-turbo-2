import { Module } from '@nestjs/common'

import { GoogleProfileDetailsRepository } from '../../../repositories'

import { AdminGoogleProfileDetailsController } from './admin-google-profile-details.controller'
import { AdminGoogleProfileDetailsService } from './admin-google-profile-details.service'

@Module({
  controllers: [AdminGoogleProfileDetailsController],
  providers: [GoogleProfileDetailsRepository, AdminGoogleProfileDetailsService],
  exports: [GoogleProfileDetailsRepository, AdminGoogleProfileDetailsService],
})
export class AdminGoogleProfileDetailsModule {}
