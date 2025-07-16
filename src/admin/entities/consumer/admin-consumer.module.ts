import { Module } from '@nestjs/common'

import { ConsumerRepository } from '../../../repositories'
import { AdminGoogleProfileDetailsModule } from '../google-profile-details/admin-google-profile-details.module'

import { AdminConsumerController } from './admin-consumer.controller'
import { AdminConsumerService } from './admin-consumer.service'

@Module({
  imports: [AdminGoogleProfileDetailsModule],
  controllers: [AdminConsumerController],
  providers: [ConsumerRepository, AdminConsumerService],
  exports: [ConsumerRepository, AdminConsumerService],
})
export class AdminConsumerModule {}
