import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../auth/jwt.guard';
import { Identity, type IIdentityContext } from '../../common';
import { AdminV2AccessService } from '../admin-v2-access.service';
import { AdminV2PaymentsService } from './admin-v2-payments.service';

function one(value: string | string[] | undefined): string | undefined {
  return (typeof value === `string` ? value : value?.[0])?.trim() || undefined;
}

function toNumber(value: string | undefined): number | undefined {
  if (value == null) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseDate(value: string | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

@UseGuards(JwtAuthGuard)
@ApiCookieAuth()
@ApiTags(`Admin v2: Payments`)
@Controller(`admin-v2/payments`)
export class AdminV2PaymentsController {
  constructor(
    private readonly service: AdminV2PaymentsService,
    private readonly accessService: AdminV2AccessService,
  ) {}

  @Get()
  async listPaymentRequests(
    @Identity() admin: IIdentityContext,
    @Query() query: Record<string, string | string[] | undefined>,
  ) {
    await this.accessService.assertCapability(admin, `payments.read`);
    return this.service.listPaymentRequests({
      cursor: one(query.cursor),
      limit: toNumber(one(query.limit)),
      q: one(query.q),
      status: one(query.status),
      paymentRail: one(query.paymentRail),
      currencyCode: one(query.currencyCode),
      amountMin: toNumber(one(query.amountMin)),
      amountMax: toNumber(one(query.amountMax)),
      dueDateFrom: parseDate(one(query.dueDateFrom)),
      dueDateTo: parseDate(one(query.dueDateTo)),
      createdFrom: parseDate(one(query.createdFrom)),
      createdTo: parseDate(one(query.createdTo)),
      overdue: one(query.overdue) === `true`,
    });
  }

  @Get(`operations-queue`)
  async getPaymentOperationsQueue(@Identity() admin: IIdentityContext) {
    await this.accessService.assertCapability(admin, `payments.read`);
    return this.service.getPaymentOperationsQueue();
  }

  @Get(`:id`)
  async getPaymentRequestCase(@Identity() admin: IIdentityContext, @Param(`id`) id: string) {
    await this.accessService.assertCapability(admin, `payments.read`);
    return this.service.getPaymentRequestCase(id);
  }
}
