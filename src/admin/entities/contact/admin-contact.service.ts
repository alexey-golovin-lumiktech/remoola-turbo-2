import { Inject, Injectable } from '@nestjs/common'

import { IContactModel } from '@wirebill/shared-common/models'

import { BaseService } from '../../../common'
import { AdminConsumerService } from '../consumer/admin-consumer.service'

import { AdminContactRepository } from './admin-contact.repository'

@Injectable()
export class AdminContactService extends BaseService<IContactModel, AdminContactRepository> {
  constructor(
    @Inject(AdminContactRepository) repository: AdminContactRepository,
    @Inject(AdminConsumerService) private readonly adminConsumerService: AdminConsumerService,
  ) {
    super(repository)
  }
}
