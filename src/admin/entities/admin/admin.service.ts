import { BadRequestException, Inject, Injectable } from '@nestjs/common'

import { IAdminModel } from '@wirebill/shared-common/models'

import { BaseService } from '../../../common'
import { ADMIN } from '../../../dtos'
import { generatePasswordHash, generatePasswordHashSalt, passwordsIsEqual } from '../../../utils'

import { AdminRepository } from './admin.repository'

@Injectable()
export class AdminService extends BaseService<IAdminModel, AdminRepository> {
  constructor(@Inject(AdminRepository) adminRepository: AdminRepository) {
    super(adminRepository)
  }

  findByEmail(email: string): Promise<IAdminModel | null> {
    return this.repository.qb.where({ email }).first()
  }

  async create(body: ADMIN.AdminCreate): Promise<IAdminModel> {
    const salt = generatePasswordHashSalt(10)
    const password = generatePasswordHash({ password: body.password, salt })
    return this.repository.create({ ...body, salt, password })
  }

  async update(adminId: string, body: ADMIN.AdminUpdate): Promise<IAdminModel> {
    const admin = await this.repository.findById(adminId)
    if (!admin) throw new BadRequestException(`No admin for provided adminId: ${adminId}`)

    const incomingBodyPasswordIsEqualToAdminExistPassword = passwordsIsEqual({
      incomingPass: body.password,
      password: admin.password,
      salt: admin.salt,
    })

    if (!incomingBodyPasswordIsEqualToAdminExistPassword) {
      const salt = generatePasswordHashSalt(10)
      const password = generatePasswordHash({ password: body.password, salt: admin.salt })
      return this.repository.updateById(adminId, { ...body, salt, password })
    }

    return this.repository.updateById(adminId, body)
  }
}
