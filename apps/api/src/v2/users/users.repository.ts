import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { UserEntityV2 } from './user.entity';
import { BaseRepository } from '../../core/repository/base.repository';

@Injectable()
export class UsersRepository extends BaseRepository<UserEntityV2> {
  constructor(dataSource: DataSource) {
    super(UserEntityV2, dataSource.createEntityManager());
  }

  findByEmail(email: string) {
    return this.findOne({ where: { email } });
  }
}
