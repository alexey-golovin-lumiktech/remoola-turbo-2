import { forwardRef, Module } from '@nestjs/common'

import { AdminConsumerModule } from '../consumer/admin-consumer.module'

import { AdminContactController } from './admin-contact.controller'
import { AdminContactRepository } from './admin-contact.repository'
import { AdminContactService } from './admin-contact.service'

@Module({
  imports: [forwardRef(() => AdminConsumerModule)],
  controllers: [AdminContactController],
  providers: [AdminContactRepository, AdminContactService],
  exports: [AdminContactRepository, AdminContactService],
})
export class AdminContactModule {}
