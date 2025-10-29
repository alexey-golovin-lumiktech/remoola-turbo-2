import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { UserRole } from '../../../common';
import { Roles } from '../../auth/roles.decorator';
import { ClientsService } from '../services/clients.service';

@ApiTags(`admin`)
@Controller({ path: `admin/clients`, version: `1` })
export class ClientsController {
  constructor(private readonly service: ClientsService) {}

  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Get()
  search(@Query(`search`) search?: string) {
    return this.service.search(search);
  }

  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Get(`:clientId`)
  getById(@Param(`clientId`) clientId: string) {
    return this.service.getById(clientId);
  }
}
