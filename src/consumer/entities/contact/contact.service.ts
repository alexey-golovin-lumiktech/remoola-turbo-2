import { Inject, Injectable } from '@nestjs/common'

import { IContactModel } from '@wirebill/shared-common/models'

import { BaseService } from '../../../common'

import { ContactRepository } from './contact.repository'

@Injectable()
export class ContactService extends BaseService<IContactModel, ContactRepository> {
  constructor(@Inject(ContactRepository) repository: ContactRepository) {
    super(repository)
  }
}
