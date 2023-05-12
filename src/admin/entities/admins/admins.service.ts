import { Inject, Injectable } from '@nestjs/common'

import { BaseService } from '../../../common'
import { Admin } from '../../../dtos'
import { IAdminModel } from '../../../models'
import { generatePasswordHash, generatePasswordHashSalt } from '../../../utils'

import { AdminsRepository } from './admins.repository'

@Injectable()
export class AdminsService extends BaseService<IAdminModel, AdminsRepository> {
  constructor(@Inject(AdminsRepository) adminRepository: AdminsRepository) {
    super(adminRepository)
  }

  findByEmail(email: string): Promise<IAdminModel | null> {
    return this.repository.query.where({ email }).first()
  }

  async create(body: any): Promise<Admin> {
    body.salt = generatePasswordHashSalt(10)
    body.password = generatePasswordHash({ password: body.password, salt: body.salt })
    return this.repository.create(body)
  }

  async update(consumerId: string, body: any): Promise<Admin> {
    const consumer = await this.repository.findById(consumerId)

    if (consumer.password != body.password /* password changed by super admin */) {
      const salt = generatePasswordHashSalt(10)
      const password = generatePasswordHash({ password: body.password, salt })
      Object.assign(body, { password, salt }) /* add new salt + pass to body(consumerModel) */
    }

    const updated = await this.repository.updateById(consumerId, body)
    return updated
  }
}
