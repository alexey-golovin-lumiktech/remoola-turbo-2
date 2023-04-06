import { Inject, Injectable } from '@nestjs/common'
import { User } from 'src/dtos'
import { genPassSalt, genPass } from 'src/utils'
import { BaseService } from '../../../common/base.service'
import { IUserModel } from '../../../models'
import { GoogleProfilesService } from '../googleProfiles/googleProfiles.service'
import { UsersRepository } from './users.repository'

@Injectable()
export class UsersService extends BaseService<IUserModel, UsersRepository> {
  constructor(
    @Inject(UsersRepository) userRepository: UsersRepository,
    @Inject(GoogleProfilesService) private readonly profileService: GoogleProfilesService
  ) {
    super(userRepository)
  }

  findByEmail(email: string): Promise<IUserModel | null> {
    return this.repository.query.where({ email }).first()
  }

  async create(body: any): Promise<User> {
    const salt = genPassSalt(10)
    const password = genPass({ password: body.password, salt })
    return this.repository.create({ ...body, password, salt })
  }

  async update(userId: string, body: any): Promise<User> {
    const salt = genPassSalt(10)
    const password = genPass({ password: body.password, salt })
    const updated = await this.repository.updateById(userId, { ...body, ...(body.password != null && { password, salt }) })
    return updated
  }
}
