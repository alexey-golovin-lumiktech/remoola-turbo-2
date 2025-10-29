import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { UserRole } from '../../../common';
import { Roles } from '../../auth/roles.decorator';
import { AdminsService } from '../services/admins.service';

@ApiTags(`admin`)
@Controller({ path: `admin/admins`, version: `1` })
export class AdminsController {
  constructor(private readonly service: AdminsService) {}

  @Roles(UserRole.SUPERADMIN)
  @Get()
  search(@Query(`search`) search?: string) {
    return this.service.search(search);
  }

  @Roles(UserRole.SUPERADMIN)
  @Get(`:adminId`)
  getById(@Param(`adminId`) adminId: string) {
    return this.service.getById(adminId);
  }
}
