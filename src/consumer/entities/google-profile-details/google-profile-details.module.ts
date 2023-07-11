import { Module } from '@nestjs/common'

import { GoogleProfileDetailsRepository } from './google-profile-details.repository'
import { GoogleProfileDetailsService } from './google-profile-details.service'

@Module({
  providers: [GoogleProfileDetailsService, GoogleProfileDetailsRepository],
  exports: [GoogleProfileDetailsService, GoogleProfileDetailsRepository],
})
export class GoogleProfileDetailsModule {}
