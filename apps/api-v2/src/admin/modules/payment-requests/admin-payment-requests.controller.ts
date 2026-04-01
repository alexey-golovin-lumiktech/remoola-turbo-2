import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiBasicAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { PAYMENT_REVERSAL_KIND } from '@remoola/api-types';
import { type AdminModel } from '@remoola/database-2';

import { AdminPaymentRequestsService } from './admin-payment-requests.service';
import { AdminExpectationDateArchiveQuery, AdminPaymentRequestsListQuery, PaymentReversalBody } from './dto';
import { Identity } from '../../../common';
import { AdminAuthService } from '../../auth/admin-auth.service';

function one(v: string | string[] | undefined): string | undefined {
  return (typeof v === `string` ? v : v?.[0])?.trim() || undefined;
}

function parsePaymentRequestsListQuery(dto: AdminPaymentRequestsListQuery) {
  const pageRaw = one(dto.page as string | string[] | undefined);
  const pageSizeRaw = one(dto.pageSize as string | string[] | undefined);
  const pageNum = pageRaw != null && Number.isFinite(Number(pageRaw)) ? Number(pageRaw) : undefined;
  const pageSizeNum = pageSizeRaw != null && Number.isFinite(Number(pageSizeRaw)) ? Number(pageSizeRaw) : undefined;
  return {
    page: pageNum,
    pageSize: pageSizeNum,
    q: one(dto.q as string | string[] | undefined),
    status: one(dto.status as string | string[] | undefined),
    includeDeleted: one(dto.includeDeleted as string | string[] | undefined) === `true`,
  };
}

function parseExpectationDateArchiveQuery(dto: AdminExpectationDateArchiveQuery) {
  const pageRaw = one(dto.page as string | string[] | undefined);
  const pageSizeRaw = one(dto.pageSize as string | string[] | undefined);
  const pageNum = pageRaw != null && Number.isFinite(Number(pageRaw)) ? Number(pageRaw) : undefined;
  const pageSizeNum = pageSizeRaw != null && Number.isFinite(Number(pageSizeRaw)) ? Number(pageSizeRaw) : undefined;
  return {
    query: one(dto.q as string | string[] | undefined),
    page: pageNum,
    pageSize: pageSizeNum,
  };
}

@ApiTags(`Admin: Payment Requests`)
@ApiBearerAuth(`bearer`) // 👈 tells Swagger to attach Bearer token
@ApiBasicAuth(`basic`) // 👈 optional, if this route also accepts Basic Auth
@Controller(`admin/payment-requests`)
export class AdminPaymentRequestsController {
  constructor(
    private readonly service: AdminPaymentRequestsService,
    private readonly adminAuthService: AdminAuthService,
  ) {}

  @Get()
  findAllPaymentRequests(@Query() query: AdminPaymentRequestsListQuery) {
    return this.service.findAllPaymentRequests(parsePaymentRequestsListQuery(query));
  }

  @Get(`expectation-date-archive`)
  getExpectationDateArchive(@Query() query: AdminExpectationDateArchiveQuery) {
    return this.service.getExpectationDateArchive(parseExpectationDateArchiveQuery(query));
  }

  @Get(`:id`)
  getById(@Param(`id`) id: string) {
    return this.service.getById(id);
  }

  @Post(`:id/refund`)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async createRefund(@Identity() admin: AdminModel, @Param(`id`) id: string, @Body() body: PaymentReversalBody) {
    await this.adminAuthService.verifyStepUp(admin.id, body.passwordConfirmation);
    const { amount, reason } = body;
    return this.service.createReversal(id, { amount, reason, kind: PAYMENT_REVERSAL_KIND.REFUND }, admin.id);
  }

  @Post(`:id/chargeback`)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async createChargeback(@Identity() admin: AdminModel, @Param(`id`) id: string, @Body() body: PaymentReversalBody) {
    await this.adminAuthService.verifyStepUp(admin.id, body.passwordConfirmation);
    const { amount, reason } = body;
    return this.service.createReversal(id, { amount, reason, kind: PAYMENT_REVERSAL_KIND.CHARGEBACK }, admin.id);
  }
}
