import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiBasicAuth } from '@nestjs/swagger';

import { AdminConsumersService } from './admin-consumers.service';
import { AdminConsumersListQuery } from './dto';
import { ConsumerVerificationUpdateDto } from '../../../dtos/admin';

function one(v: string | string[] | undefined): string | undefined {
  return (typeof v === `string` ? v : v?.[0])?.trim() || undefined;
}

function parseConsumersListQuery(dto: AdminConsumersListQuery) {
  const pageRaw = one(dto.page as string | string[] | undefined);
  const pageSizeRaw = one(dto.pageSize as string | string[] | undefined);
  const pageNum = pageRaw != null && Number.isFinite(Number(pageRaw)) ? Number(pageRaw) : undefined;
  const pageSizeNum = pageSizeRaw != null && Number.isFinite(Number(pageSizeRaw)) ? Number(pageSizeRaw) : undefined;
  const includeDeleted = one(dto.includeDeleted as string | string[] | undefined) === `true`;
  return {
    page: pageNum,
    pageSize: pageSizeNum,
    q: one(dto.q as string | string[] | undefined),
    accountType: one(dto.accountType as string | string[] | undefined),
    contractorKind: one(dto.contractorKind as string | string[] | undefined),
    verificationStatus: one(dto.verificationStatus as string | string[] | undefined),
    verified: one(dto.verified as string | string[] | undefined),
    includeDeleted,
  };
}

@ApiTags(`Admin: Consumers`)
@ApiBearerAuth(`bearer`) // 👈 tells Swagger to attach Bearer token
@ApiBasicAuth(`basic`) // 👈 optional, if this route also accepts Basic Auth
@Controller(`admin/consumers`)
export class AdminConsumersController {
  constructor(private readonly service: AdminConsumersService) {}

  @Get()
  findAllConsumers(@Query() query: AdminConsumersListQuery) {
    return this.service.findAllConsumers(parseConsumersListQuery(query));
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
