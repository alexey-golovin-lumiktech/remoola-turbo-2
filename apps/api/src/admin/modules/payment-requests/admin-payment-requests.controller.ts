import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiBasicAuth } from '@nestjs/swagger';

import { AdminPaymentRequestsService } from './admin-payment-requests.service';

@ApiTags(`Admin: Payment Requests`)
@ApiBearerAuth(`bearer`) // 👈 tells Swagger to attach Bearer token
@ApiBasicAuth(`basic`) // 👈 optional, if this route also accepts Basic Auth
@Controller(`admin/payment-requests`)
export class AdminPaymentRequestsController {
  constructor(private readonly service: AdminPaymentRequestsService) {}

  @Get()
  findAllPaymentRequests() {
    return this.service.findAllPaymentRequests();
  }

  @Get(`:id`)
  geyById(@Param(`id`) id: string) {
    return this.service.geyById(id);
  }
}
