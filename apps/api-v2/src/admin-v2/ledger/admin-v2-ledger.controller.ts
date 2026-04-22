import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { JwtAuthGuard } from '../../auth/jwt.guard';
import { Identity, type IIdentityContext } from '../../common';
import { AdminV2AccessService } from '../admin-v2-access.service';
import { AdminV2LedgerService } from './admin-v2-ledger.service';

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
@ApiTags(`Admin v2: Ledger`)
@Throttle({ default: { limit: 500, ttl: 60000 } })
@Controller(`admin-v2/ledger`)
export class AdminV2LedgerController {
  constructor(
    private readonly service: AdminV2LedgerService,
    private readonly accessService: AdminV2AccessService,
  ) {}

  @Get()
  async listLedgerEntries(
    @Identity() admin: IIdentityContext,
    @Query() query: Record<string, string | string[] | undefined>,
  ) {
    await this.accessService.assertCapability(admin, `ledger.read`);
    return this.service.listLedgerEntries({
      cursor: one(query.cursor),
      limit: toNumber(one(query.limit)),
      q: one(query.q),
      type: one(query.type),
      status: one(query.status),
      currencyCode: one(query.currencyCode),
      paymentRequestId: one(query.paymentRequestId),
      consumerId: one(query.consumerId),
      amountSign: one(query.amountSign),
      dateFrom: parseDate(one(query.dateFrom)),
      dateTo: parseDate(one(query.dateTo)),
    });
  }

  @Get(`disputes`)
  async listDisputes(
    @Identity() admin: IIdentityContext,
    @Query() query: Record<string, string | string[] | undefined>,
  ) {
    await this.accessService.assertCapability(admin, `ledger.read`);
    return this.service.listDisputes({
      cursor: one(query.cursor),
      limit: toNumber(one(query.limit)),
      paymentRequestId: one(query.paymentRequestId),
      consumerId: one(query.consumerId),
      q: one(query.q),
      dateFrom: parseDate(one(query.dateFrom)),
      dateTo: parseDate(one(query.dateTo)),
    });
  }

  @Get(`:id`)
  async getLedgerEntryCase(@Identity() admin: IIdentityContext, @Param(`id`) id: string) {
    await this.accessService.assertCapability(admin, `ledger.read`);
    return this.service.getLedgerEntryCase(id);
  }
}
