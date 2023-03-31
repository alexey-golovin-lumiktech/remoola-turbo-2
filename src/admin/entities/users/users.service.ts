import { Inject, Injectable } from '@nestjs/common'
import { BaseService } from '../../../common/base.service'
import { IUserModel } from '../../../models'
import { GoogleProfilesService } from '../google-profiles/google-profiles.service'
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
}
