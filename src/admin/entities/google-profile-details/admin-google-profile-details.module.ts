import { Module } from '@nestjs/common'

import { AdminGoogleProfileDetailsController } from './admin-google-profile-details.controller'
import { AdminGoogleProfileDetailsRepository } from './admin-google-profile-details.repository'
import { AdminGoogleProfileDetailsService } from './admin-google-profile-details.service'

@Module({
  controllers: [AdminGoogleProfileDetailsController],
  providers: [AdminGoogleProfileDetailsService, AdminGoogleProfileDetailsRepository],
  exports: [AdminGoogleProfileDetailsService, AdminGoogleProfileDetailsRepository],
})
export class AdminGoogleProfileDetailsModule {}
