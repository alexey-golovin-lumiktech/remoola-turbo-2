import { Module } from '@nestjs/common'

import { ContactRepository } from '@-/repositories'

import { AdminConsumerModule } from '../consumer/admin-consumer.module'

import { AdminContactController } from './admin-contact.controller'
import { AdminContactService } from './admin-contact.service'

@Module({
  imports: [AdminConsumerModule],
  controllers: [AdminContactController],
  providers: [ContactRepository, AdminContactService],
  exports: [ContactRepository, AdminContactService],
})
export class AdminContactModule {}
