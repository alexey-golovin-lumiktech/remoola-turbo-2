import { Inject, Injectable } from '@nestjs/common'
import { BaseService } from '../../../common/base.service'
import { IUserModel } from '../../../models'
import { UsersRepository } from './users.repository'
import { GoogleProfilesRepository } from '../googleProfiles/googleProfiles.repository'

@Injectable()
export class UsersService extends BaseService<IUserModel, UsersRepository> {
  constructor(
    @Inject(UsersRepository) userRepository: UsersRepository,
    @Inject(GoogleProfilesRepository) private googleProfileRepository: GoogleProfilesRepository
  ) {
    super(userRepository)
  }

  async findByEmail(email: string): Promise<IUserModel | null> {
    const [user] = await this.repository.find({ filter: { email, deletedAt: null } })
    if (user) {
      const [profile] = await this.googleProfileRepository.find({ filter: { id: user.googleProfileId, deletedAt: null } })
      if (profile) Object.assign(user, { picture: profile.picture })
    }
    return user
  }
}
