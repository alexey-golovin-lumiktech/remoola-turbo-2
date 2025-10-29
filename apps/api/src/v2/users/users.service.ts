import { Injectable } from '@nestjs/common';

import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  private users = [
    {
      id: crypto.randomUUID(),
      name: `Alice`,
      active: true,
      createdAt: new Date(),
    },
  ];

  findAllV2() {
    return this.users;
  }

  createV2(dto: CreateUserDto) {
    const created = { id: crypto.randomUUID(), ...dto, createdAt: new Date() };
    this.users.push(created);
    return created;
  }
}
