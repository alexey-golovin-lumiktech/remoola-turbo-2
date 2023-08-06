import { Inject, Injectable } from '@nestjs/common'
import { BaseService } from 'src/common'

import { IContactModel } from '@wirebill/shared-common/models'

import { ConsumerService } from '../consumer/consumer.service'

import { ContactRepository } from './contact.repository'

@Injectable()
export class ContactService extends BaseService<IContactModel, ContactRepository> {
  constructor(
    @Inject(ContactRepository) repository: ContactRepository,
    @Inject(ConsumerService) private readonly consumersService: ConsumerService,
  ) {
    super(repository)
  }
}
