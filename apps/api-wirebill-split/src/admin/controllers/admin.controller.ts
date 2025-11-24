import { Controller, Get } from '@nestjs/common';
import { ApiBasicAuth, ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { type AdminModel } from '@remoola/database';

import { Identity } from '../../common';
import { AdminsService } from '../services/admins.service';

@ApiTags(`Admin: Admins`)
@ApiBearerAuth(`bearer`) // 👈 tells Swagger to attach Bearer token
@ApiBasicAuth(`basic`) // 👈 optional, if this route also accepts Basic Auth
@Controller(`admins`)
export class AdminsController {
  constructor(private readonly service: AdminsService) {}

  @Get()
  findAllAdmins() {
    return this.service.findAllAdmins();
  }

  @Get(`me`)
  me(@Identity() identity: AdminModel) {
    return identity;
  }
}
