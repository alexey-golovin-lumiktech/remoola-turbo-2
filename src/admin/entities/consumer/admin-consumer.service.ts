import { Inject, Injectable } from '@nestjs/common'

import { IConsumerModel } from '@wirebill/shared-common/models'

import { BaseService } from '../../../common'
import { generatePasswordHash, generatePasswordHashSalt } from '../../../utils'
import { AdminGoogleProfileDetailsService } from '../google-profile-details/admin-google-profile-details.service'

import { AdminConsumerRepository } from './admin-consumer.repository'

@Injectable()
export class AdminConsumerService extends BaseService<IConsumerModel, AdminConsumerRepository> {
  constructor(
    @Inject(AdminConsumerRepository) consumersRepository: AdminConsumerRepository,
    @Inject(AdminGoogleProfileDetailsService) private readonly profileService: AdminGoogleProfileDetailsService,
  ) {
    super(consumersRepository)
  }

  findByEmail(email: string): Promise<IConsumerModel | null> {
    return this.repository.qb.where({ email }).first()
  }

  async create(body: any): Promise<IConsumerModel> {
    const salt = generatePasswordHashSalt(10)
    const password = generatePasswordHash({ password: body.password, salt })
    return this.repository.create({ ...body, password, salt })
  }

  async update(consumerId: string, body: any): Promise<IConsumerModel> {
    const salt = generatePasswordHashSalt(10)
    const password = generatePasswordHash({ password: body.password, salt })
    const updated = await this.repository.updateById(consumerId, { ...body, ...(body.password != null && { password, salt }) })
    return updated
  }
}
