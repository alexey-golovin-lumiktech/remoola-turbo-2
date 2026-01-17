import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiBasicAuth } from '@nestjs/swagger';

import { AdminConsumersService } from './admin-consumers.service';

@ApiTags(`Admin: Consumers`)
@ApiBearerAuth(`bearer`) // 👈 tells Swagger to attach Bearer token
@ApiBasicAuth(`basic`) // 👈 optional, if this route also accepts Basic Auth
@Controller(`admin/consumers`)
export class AdminConsumersController {
  constructor(private readonly service: AdminConsumersService) {}

  @Get()
  findAllConsumers() {
    return this.service.findAllConsumers();
  }

  @Get(`:id`)
  getById(@Param(`id`) id: string) {
    return this.service.getById(id);
  }
}
