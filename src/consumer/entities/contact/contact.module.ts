import { forwardRef, Module } from '@nestjs/common'

import { ConsumerModule } from '../consumer/consumer.module'

import { ContactRepository } from './contact.repository'
import { ContactService } from './contact.service'

@Module({
  imports: [forwardRef(() => ConsumerModule)],
  providers: [ContactRepository, ContactService],
  exports: [ContactRepository, ContactService],
})
export class ContactModule {}
