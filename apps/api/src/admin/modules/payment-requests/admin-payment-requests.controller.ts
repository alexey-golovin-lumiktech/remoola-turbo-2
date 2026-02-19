import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiBasicAuth } from '@nestjs/swagger';

import { type AdminModel } from '@remoola/database-2';

import { AdminPaymentRequestsService } from './admin-payment-requests.service';
import {
  AdminExpectationDateArchiveQuery,
  AdminPaymentRequestsListQuery,
  PaymentReversalBody,
  PaymentReversalKind,
} from './dto';
import { Identity } from '../../../common';

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
  constructor(private readonly service: AdminPaymentRequestsService) {}

  @Get()
  findAllPaymentRequests(@Query() query: AdminPaymentRequestsListQuery) {
    return this.service.findAllPaymentRequests(parsePaymentRequestsListQuery(query));
  }

  @Get(`expectation-date-archive`)
  getExpectationDateArchive(@Query() query: AdminExpectationDateArchiveQuery) {
    return this.service.getExpectationDateArchive(parseExpectationDateArchiveQuery(query));
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
