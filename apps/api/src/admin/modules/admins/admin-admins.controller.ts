import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiBasicAuth } from '@nestjs/swagger';

import { type AdminModel } from '@remoola/database-2';
import { adminErrorCodes } from '@remoola/shared-constants';

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
  findAllAdmins(@Identity() admin: AdminModel, @Query(`includeDeleted`) includeDeleted?: string) {
    const includeDeletedBool = includeDeleted === `true`;
    return this.service.findAllAdmins(admin, includeDeletedBool);
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
      throw new BadRequestException(adminErrorCodes.ADMIN_ONLY_SUPER_CAN_CHANGE_PASSWORDS);
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
      throw new BadRequestException(adminErrorCodes.ADMIN_ONLY_SUPER_CAN_UPDATE_ADMINS);
    }
    if (action !== `delete` && action !== `restore`) {
      throw new BadRequestException(adminErrorCodes.ADMIN_UNSUPPORTED_ADMIN_ACTION);
    }
    if (action === `delete` && adminId === admin.id) {
      throw new BadRequestException(adminErrorCodes.ADMIN_CANNOT_DELETE_YOURSELF);
    }
    return this.service.updateAdminStatus(adminId, action);
  }

  @Post(`system/migrate-payment-methods`)
  migratePaymentMethods(@Identity() admin: AdminModel) {
    if (admin.type !== `SUPER`) {
      throw new BadRequestException(adminErrorCodes.ADMIN_ONLY_SUPER_CAN_RUN_MIGRATIONS);
    }
    return this.stripeWebhookService.migrateAllPaymentMethods();
  }
}
