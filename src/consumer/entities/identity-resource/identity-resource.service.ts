import { Inject, Injectable } from '@nestjs/common'
import { BaseService } from 'src/common'

import { IIdentityResourceModel } from '@wirebill/shared-common/models'

import { ConsumerService } from '../consumer/consumer.service'

import { IdentityResourceRepository } from './identity-resource.repository'

@Injectable()
export class IdentityResourceService extends BaseService<IIdentityResourceModel, IdentityResourceRepository> {
  constructor(
    @Inject(IdentityResourceRepository) repository: IdentityResourceRepository,
    @Inject(ConsumerService) private readonly consumersService: ConsumerService,
  ) {
    super(repository)
  }
}
