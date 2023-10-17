import { forwardRef, Module } from '@nestjs/common'

import { GoogleProfileDetailsRepository } from '../../../repositories'
import { ConsumerModule } from '../consumer/consumer.module'

import { GoogleProfileDetailsController } from './google-profile-details.controller'
import { GoogleProfileDetailsService } from './google-profile-details.service'

@Module({
  imports: [forwardRef(() => ConsumerModule)],
  controllers: [GoogleProfileDetailsController],
  providers: [GoogleProfileDetailsRepository, GoogleProfileDetailsService],
  exports: [GoogleProfileDetailsRepository, GoogleProfileDetailsService],
})
export class GoogleProfileDetailsModule {}
