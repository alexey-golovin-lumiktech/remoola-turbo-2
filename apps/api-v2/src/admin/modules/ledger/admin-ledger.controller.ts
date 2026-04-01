import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiBasicAuth } from '@nestjs/swagger';

import { AdminLedgersService } from './admin-ledger.service';
import { AdminLedgerListQuery } from './dto';

function one(v: string | string[] | undefined): string | undefined {
  return (typeof v === `string` ? v : v?.[0])?.trim() || undefined;
}

function parseLedgerListQuery(dto: AdminLedgerListQuery) {
  const pageRaw = one(dto.page as string | string[] | undefined);
  const pageSizeRaw = one(dto.pageSize as string | string[] | undefined);
  const pageNum = pageRaw != null && Number.isFinite(Number(pageRaw)) ? Number(pageRaw) : undefined;
  const pageSizeNum = pageSizeRaw != null && Number.isFinite(Number(pageSizeRaw)) ? Number(pageSizeRaw) : undefined;
  return {
    page: pageNum,
    pageSize: pageSizeNum,
    q: one(dto.q as string | string[] | undefined),
    type: one(dto.type as string | string[] | undefined),
    status: one(dto.status as string | string[] | undefined),
    includeDeleted: one(dto.includeDeleted as string | string[] | undefined) === `true`,
  };
}

@ApiTags(`Admin: Ledger`)
@ApiBearerAuth(`bearer`) // 👈 tells Swagger to attach Bearer token
@ApiBasicAuth(`basic`) // 👈 optional, if this route also accepts Basic Auth
@Controller(`admin/ledger`)
export class AdminLedgersController {
  constructor(private readonly service: AdminLedgersService) {}

  @Get()
  findAll(@Query() query: AdminLedgerListQuery) {
    return this.service.findAll(parseLedgerListQuery(query));
  }
}
