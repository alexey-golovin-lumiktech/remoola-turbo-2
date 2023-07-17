import { forwardRef, Module } from '@nestjs/common'

import { ConsumerModule } from '../consumer/consumer.module'

import { GoogleProfileDetailsRepository } from './google-profile-details.repository'
import { GoogleProfileDetailsService } from './google-profile-details.service'

@Module({
  imports: [forwardRef(() => ConsumerModule)],
  providers: [GoogleProfileDetailsService, GoogleProfileDetailsRepository],
  exports: [GoogleProfileDetailsService, GoogleProfileDetailsRepository],
})
export class GoogleProfileDetailsModule {}
