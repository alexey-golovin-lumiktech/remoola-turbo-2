import { Inject, Injectable } from '@nestjs/common'
import { BaseService } from 'src/common'

import { IContactModel } from '@wirebill/shared-common/models'

import { ContactRepository } from './contact.repository'

@Injectable()
export class ContactService extends BaseService<IContactModel, ContactRepository> {
  constructor(@Inject(ContactRepository) repository: ContactRepository) {
    super(repository)
  }
}
