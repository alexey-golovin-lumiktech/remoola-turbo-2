import { Module } from '@nestjs/common'

import { ContactRepository } from '../../../repositories'

import { ContactService } from './contact.service'
import { ContactController } from './contact-controller'

@Module({
  controllers: [ContactController],
  providers: [ContactRepository, ContactService],
  exports: [ContactRepository, ContactService],
})
export class ContactModule {}
