import { Inject, Injectable } from '@nestjs/common'

import { GoogleProfilesService } from '../google-profiles/google-profiles.service'

import { AdminConsumersRepository } from './consumer.repository'

import { BaseService } from 'src/common'
import { ADMIN } from 'src/dtos'
import { IConsumerModel } from 'src/models'
import { generatePasswordHash, generatePasswordHashSalt } from 'src/utils'

@Injectable()
export class AdminConsumersService extends BaseService<IConsumerModel, AdminConsumersRepository> {
  constructor(
    @Inject(AdminConsumersRepository) consumersRepository: AdminConsumersRepository,
    @Inject(GoogleProfilesService) private readonly profileService: GoogleProfilesService,
  ) {
    super(consumersRepository)
  }

  findByEmail(email: string): Promise<IConsumerModel | null> {
    return this.repository.qb.where({ email }).first()
  }

  async create(body: any): Promise<ADMIN.Consumer> {
    const salt = generatePasswordHashSalt(10)
    const password = generatePasswordHash({ password: body.password, salt })
    return this.repository.create({ ...body, password, salt })
  }

  async update(consumerId: string, body: any): Promise<ADMIN.Consumer> {
    const salt = generatePasswordHashSalt(10)
    const password = generatePasswordHash({ password: body.password, salt })
    const updated = await this.repository.updateById(consumerId, { ...body, ...(body.password != null && { password, salt }) })
    return updated
  }
}
