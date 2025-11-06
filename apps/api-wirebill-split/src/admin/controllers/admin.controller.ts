import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AdminsService } from '../services/admins.service';

@ApiTags(`Admin: Admins`)
@ApiBearerAuth()
@Controller(`admins`)
export class AdminsController {
  constructor(private readonly usersService: AdminsService) {}

  @Get()
  findAllAdmins() {
    return this.usersService.findAllAdmins();
  }
}
