import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, ILike, Repository } from 'typeorm';

import { UserRole } from '../../../common';
import { UserEntity } from '../../users/user.entity';

@Injectable()
export class AdminsService {
  constructor(@InjectRepository(UserEntity) private repository: Repository<UserEntity>) {}

  search(search?: string) {
    const options: FindManyOptions<UserEntity> = { order: { createdAt: `DESC` } };
    const role = UserRole.ADMIN;

    if (search) {
      options.where = [
        { role, email: ILike(`%${search}%`) },
        { role, name: ILike(`%${search}%`) },
      ];
    } else options.where = { role };

    return this.repository.find(options);
  }

  getById(adminId: string) {
    return this.repository.findOne({
      where: { role: UserRole.ADMIN, id: adminId },
    });
  }
}
