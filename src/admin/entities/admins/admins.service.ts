import { Inject, Injectable } from '@nestjs/common'
import { Admin } from 'src/dtos'
import { genPassSalt, genPass } from 'src/utils'
import { BaseService } from '../../../common/base.service'
import { IAdminModel } from '../../../models'
import { AdminsRepository } from './admins.repository'

@Injectable()
export class AdminsService extends BaseService<IAdminModel, AdminsRepository> {
  constructor(@Inject(AdminsRepository) userRepository: AdminsRepository) {
    super(userRepository)
  }

  findByEmail(email: string): Promise<IAdminModel | null> {
    return this.repository.query.where({ email }).first()
  }

  async create(body: any): Promise<Admin> {
    body.salt = genPassSalt(10)
    body.password = genPass({ password: body.password, salt: body.salt })
    return this.repository.create(body)
  }

  async update(userId: string, body: any): Promise<Admin> {
    const user = await this.repository.findById(userId)

    if (user.password != body.password /* password changed by super admin */) {
      const salt = genPassSalt(10)
      const password = genPass({ password: body.password, salt })
      Object.assign(body, { password, salt }) /* add new salt + pass to body(UserModel) */
    }

    const updated = await this.repository.updateById(userId, body)
    return updated
  }
}
