import { Inject, Injectable } from '@nestjs/common'

import { IContactModel } from '@wirebill/shared-common/models'

import { BaseService } from '../../../common'
import { ContactRepository } from '../../../repositories'

@Injectable()
export class AdminContactService extends BaseService<IContactModel, ContactRepository> {
  constructor(@Inject(ContactRepository) repository: ContactRepository) {
    super(repository)
  }
}
