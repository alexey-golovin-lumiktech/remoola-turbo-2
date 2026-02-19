import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiBasicAuth } from '@nestjs/swagger';

import { AdminLedgersService } from './admin-ledger.service';

@ApiTags(`Admin: Ledger`)
@ApiBearerAuth(`bearer`) // 👈 tells Swagger to attach Bearer token
@ApiBasicAuth(`basic`) // 👈 optional, if this route also accepts Basic Auth
@Controller(`admin/ledger`)
export class AdminLedgersController {
  constructor(private readonly service: AdminLedgersService) {}

  @Get()
  findAll(@Query(`page`) page?: string, @Query(`pageSize`) pageSize?: string) {
    const pageNum = page != null && Number.isFinite(Number(page)) ? Number(page) : undefined;
    const pageSizeNum = pageSize != null && Number.isFinite(Number(pageSize)) ? Number(pageSize) : undefined;
    return this.service.findAll({ page: pageNum, pageSize: pageSizeNum });
  }
}
