import { Controller, Get, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';

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

@ApiCookieAuth()
@ApiTags(`Admin: Ledger`)
@Controller(`admin/ledger`)
export class AdminLedgersController {
  constructor(private readonly service: AdminLedgersService) {}

  @Get()
  findAll(@Query() query: AdminLedgerListQuery) {
    return this.service.findAll(parseLedgerListQuery(query));
  }
}
