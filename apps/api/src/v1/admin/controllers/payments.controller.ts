import { Controller, Delete, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { UserRole } from '../../../common';
import { Roles } from '../../auth/roles.decorator';
import { PaymentsService } from '../services/payments.service';

@ApiTags(`admin`)
@Controller({ path: `admin/payments`, version: `1` })
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Get()
  list() {
    return this.service.list();
  }

  @Roles(UserRole.SUPERADMIN)
  @Delete(`:paymentId`)
  delete(@Param(`paymentId`) paymentId: string) {
    return this.service.delete(paymentId);
  }
}
