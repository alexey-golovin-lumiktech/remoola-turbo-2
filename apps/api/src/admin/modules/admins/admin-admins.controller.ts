import { BadRequestException, Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiBasicAuth } from '@nestjs/swagger';

import { AdminModel } from '@remoola/database-2';

import { AdminAdminsService } from './admin-admins.service';
import { JwtAuthGuard } from '../../../auth/jwt.guard';
import { Identity } from '../../../common';

@UseGuards(JwtAuthGuard)
@ApiTags(`Admin: Admins`)
@ApiBearerAuth(`bearer`) // 👈 tells Swagger to attach Bearer token
@ApiBasicAuth(`basic`) // 👈 optional, if this route also accepts Basic Auth
@Controller(`admin/admins`)
export class AdminAdminsController {
  constructor(private readonly service: AdminAdminsService) {}

  @Get()
  findAllAdmins(@Identity() admin: AdminModel) {
    return this.service.findAllAdmins(admin);
  }

  @Get(`:adminId`)
  getById(@Param(`adminId`) adminId: string) {
    return this.service.getById(adminId);
  }

  @Patch(`:adminId/password`)
  patchAdminPassword(
    @Identity() admin: AdminModel,
    @Param(`adminId`) adminId: string,
    @Body(`password`) password: string,
  ) {
    if (admin.type !== `SUPER`) {
      throw new BadRequestException(`Only SUPER admins can change admin passwords`);
    }
    return this.service.patchAdminPassword(adminId, password);
  }
}
