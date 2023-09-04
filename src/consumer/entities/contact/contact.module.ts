import { Module } from '@nestjs/common'

import { ContactRepository } from '../../../repositories'

import { ContactService } from './contact.service'

@Module({
  providers: [ContactRepository, ContactService],
  exports: [ContactRepository, ContactService],
})
export class ContactModule {}
