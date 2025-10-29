import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { IUserRole } from '../../../common';
import { UserEntity } from '../../users/user.entity';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(UserEntity) private repository: Repository<UserEntity>) {}

  patch(userId: string, body: { role: IUserRole }) {
    return this.repository.update({ id: userId }, { role: body.role });
  }
}
