import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiBasicAuth } from '@nestjs/swagger';

import { AdminConsumersService } from './admin-consumers.service';
import { ConsumerVerificationUpdateDto } from '../../../dtos/admin';

@ApiTags(`Admin: Consumers`)
@ApiBearerAuth(`bearer`) // 👈 tells Swagger to attach Bearer token
@ApiBasicAuth(`basic`) // 👈 optional, if this route also accepts Basic Auth
@Controller(`admin/consumers`)
export class AdminConsumersController {
  constructor(private readonly service: AdminConsumersService) {}

  @Get()
  findAllConsumers(@Query() query: Record<string, string | string[] | undefined>) {
    const one = (v: string | string[] | undefined) => (typeof v === `string` ? v : v?.[0])?.trim() || undefined;
    const pageRaw = one(query[`page`]);
    const pageSizeRaw = one(query[`pageSize`]);
    const pageNum = pageRaw != null && Number.isFinite(Number(pageRaw)) ? Number(pageRaw) : undefined;
    const pageSizeNum = pageSizeRaw != null && Number.isFinite(Number(pageSizeRaw)) ? Number(pageSizeRaw) : undefined;
    return this.service.findAllConsumers({
      page: pageNum,
      pageSize: pageSizeNum,
      q: one(query[`q`]),
      accountType: one(query[`accountType`]),
      contractorKind: one(query[`contractorKind`]),
      verificationStatus: one(query[`verificationStatus`]),
      verified: one(query[`verified`]),
    });
  }

  @Get(`:id`)
  getById(@Param(`id`) id: string) {
    return this.service.getById(id);
  }

  @Patch(`:id/verification`)
  updateVerification(@Param(`id`) id: string, @Body() body: ConsumerVerificationUpdateDto) {
    return this.service.updateVerification(id, body);
  }
}
