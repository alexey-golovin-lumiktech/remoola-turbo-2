import { Module } from '@nestjs/common'

import { AdminGoogleProfileDetailsModule } from '../google-profile-details/admin-google-profile-details.module'

import { AdminConsumerController } from './admin-consumer.controller'
import { AdminConsumerRepository } from './admin-consumer.repository'
import { AdminConsumerService } from './admin-consumer.service'

@Module({
  imports: [AdminGoogleProfileDetailsModule],
  controllers: [AdminConsumerController],
  providers: [AdminConsumerService, AdminConsumerRepository],
  exports: [AdminConsumerService, AdminConsumerRepository],
})
export class AdminConsumerModule {}
