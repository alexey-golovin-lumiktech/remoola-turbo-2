import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiBasicAuth } from '@nestjs/swagger';

import { type AdminModel } from '@remoola/database-2';

import { AdminPaymentRequestsService } from './admin-payment-requests.service';
import { PaymentReversalBody, PaymentReversalKind } from './dto';
import { Identity } from '../../../common';

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

  @Get(`expectation-date-archive`)
  getExpectationDateArchive(@Query(`q`) query?: string, @Query(`limit`) limit?: string) {
    const parsedLimit = limit ? Number(limit) : undefined;
    return this.service.getExpectationDateArchive({
      query,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    });
  }

  @Get(`:id`)
  geyById(@Param(`id`) id: string) {
    return this.service.geyById(id);
  }

  @Post(`:id/refund`)
  createRefund(@Identity() admin: AdminModel, @Param(`id`) id: string, @Body() body: PaymentReversalBody) {
    return this.service.createReversal(id, { ...body, kind: PaymentReversalKind.Refund }, admin.id);
  }

  @Post(`:id/chargeback`)
  createChargeback(@Identity() admin: AdminModel, @Param(`id`) id: string, @Body() body: PaymentReversalBody) {
    return this.service.createReversal(id, { ...body, kind: PaymentReversalKind.Chargeback }, admin.id);
  }
}
