import { BadRequestException, Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiBasicAuth } from '@nestjs/swagger';

import { type AdminModel } from '@remoola/database-2';

import { AdminAdminsService } from './admin-admins.service';
import { JwtAuthGuard } from '../../../auth/jwt.guard';
import { Identity } from '../../../common';
import { StripeWebhookService } from '../../../consumer/modules/payment-methods/stripe-webhook.service';

@UseGuards(JwtAuthGuard)
@ApiTags(`Admin: Admins`)
@ApiBearerAuth(`bearer`) // 👈 tells Swagger to attach Bearer token
@ApiBasicAuth(`basic`) // 👈 optional, if this route also accepts Basic Auth
@Controller(`admin/admins`)
export class AdminAdminsController {
  constructor(
    private readonly service: AdminAdminsService,
    private readonly stripeWebhookService: StripeWebhookService,
  ) {}

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

  @Patch(`:adminId`)
  updateAdmin(
    @Identity() admin: AdminModel,
    @Param(`adminId`) adminId: string,
    @Body(`action`) action: `delete` | `restore`,
  ) {
    if (admin.type !== `SUPER`) {
      throw new BadRequestException(`Only SUPER admins can update admins`);
    }
    if (action !== `delete` && action !== `restore`) {
      throw new BadRequestException(`Unsupported admin action`);
    }
    if (action === `delete` && adminId === admin.id) {
      throw new BadRequestException(`You cannot delete yourself`);
    }
    return this.service.updateAdminStatus(adminId, action);
  }

  @Post(`system/migrate-payment-methods`)
  migratePaymentMethods(@Identity() admin: AdminModel) {
    if (admin.type !== `SUPER`) {
      throw new BadRequestException(`Only SUPER admins can run system migrations`);
    }
    return this.stripeWebhookService.migrateAllPaymentMethods();
  }
}
