import { Module } from '@nestjs/common'

import { GoogleProfileDetailsRepository } from '../../../repositories'

import { GoogleProfileDetailsService } from './google-profile-details.service'

@Module({
  providers: [GoogleProfileDetailsRepository, GoogleProfileDetailsService],
  exports: [GoogleProfileDetailsRepository, GoogleProfileDetailsService],
})
export class GoogleProfileDetailsModule {}
