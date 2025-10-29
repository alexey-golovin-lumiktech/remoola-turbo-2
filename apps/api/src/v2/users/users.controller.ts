import { Controller, Get, Post, Body } from '@nestjs/common';

import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';

@Controller({ path: `users`, version: `2` })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAllV2();
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.createV2(dto);
  }
}
