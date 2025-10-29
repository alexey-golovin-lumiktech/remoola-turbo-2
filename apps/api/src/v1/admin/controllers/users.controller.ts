import { Body, Controller, Param, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { IUserRole, UserRole } from '../../../common';
import { Roles } from '../../auth/roles.decorator';
import { UsersService } from '../services/users.service';

@ApiTags(`admin`)
@Controller({ path: `admin/users`, version: `1` })
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Roles(UserRole.SUPERADMIN)
  @Patch(`:userId/role`)
  patch(@Param(`userId`) userId: string, @Body() body: { role: IUserRole }) {
    return this.service.patch(userId, body);
  }
}
