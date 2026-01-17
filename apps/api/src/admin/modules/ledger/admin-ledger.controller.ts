import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiBasicAuth } from '@nestjs/swagger';

import { AdminLedgersService } from './admin-ledger.service';

@ApiTags(`Admin: Ledger`)
@ApiBearerAuth(`bearer`) // 👈 tells Swagger to attach Bearer token
@ApiBasicAuth(`basic`) // 👈 optional, if this route also accepts Basic Auth
@Controller(`admin/ledger`)
export class AdminLedgersController {
  constructor(private readonly service: AdminLedgersService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }
}
