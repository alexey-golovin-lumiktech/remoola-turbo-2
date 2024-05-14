import { BadRequestException, Inject, Injectable } from '@nestjs/common'

import { IAdminModel } from '@wirebill/shared-common/models'

import { BaseService } from '@-/common'
import { commonUtils } from '@-/common-utils'
import { ADMIN } from '@-/dtos'
import { AdminRepository } from '@-/repositories'

@Injectable()
export class AdminService extends BaseService<IAdminModel, AdminRepository> {
  constructor(@Inject(AdminRepository) repository: AdminRepository) {
    super(repository)
  }

  findByEmail(email: string): Promise<IAdminModel | null> {
    return this.repository.findOne({ email })
  }

  async create(body: ADMIN.AdminCreate): Promise<IAdminModel> {
    const salt = commonUtils.getHashingSalt(10)
    const hash = commonUtils.hashPassword({ password: body.password, salt })
    return this.repository.create({ ...body, password: hash, salt })
  }

  async update(adminId: string, body: ADMIN.AdminUpdate): Promise<IAdminModel> {
    const admin = await this.repository.findById(adminId)
    if (!admin) throw new BadRequestException(`No admin for provided adminId: ${adminId}`)

    const validPassword = commonUtils.validatePassword({
      incomingPass: body.password,
      password: admin.password,
      salt: admin.salt,
    })

    if (validPassword == false) {
      const salt = commonUtils.getHashingSalt(10)
      const hash = commonUtils.hashPassword({ password: body.password, salt })
      return this.repository.updateById(adminId, { ...body, password: hash, salt })
    }

    return this.repository.updateById(adminId, body)
  }
}
