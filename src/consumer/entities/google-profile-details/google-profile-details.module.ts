import { forwardRef, Module } from '@nestjs/common'

import { GoogleProfileDetailsRepository } from '../../../repositories'
import { ConsumerModule } from '../consumer/consumer.module'

import { GoogleProfileDetailsService } from './google-profile-details.service'

@Module({
  imports: [forwardRef(() => ConsumerModule)],
  providers: [GoogleProfileDetailsRepository, GoogleProfileDetailsService],
  exports: [GoogleProfileDetailsRepository, GoogleProfileDetailsService],
})
export class GoogleProfileDetailsModule {}
