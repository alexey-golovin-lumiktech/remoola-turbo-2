import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { AdminV2LedgerAnomaliesService } from './admin-v2-ledger-anomalies.service';
import { JwtAuthGuard } from '../../../auth/jwt.guard';
import { Identity, type IIdentityContext } from '../../../common';
import { AdminV2AccessService } from '../../admin-v2-access.service';

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
@ApiTags(`Admin v2: Ledger anomalies`)
@Throttle({ default: { limit: 500, ttl: 60000 } })
@Controller(`admin-v2/ledger/anomalies`)
export class AdminV2LedgerAnomaliesController {
  constructor(
    private readonly service: AdminV2LedgerAnomaliesService,
    private readonly accessService: AdminV2AccessService,
  ) {}

  @Get(`summary`)
  async getSummary(@Identity() admin: IIdentityContext) {
    await this.accessService.assertCapability(admin, `ledger.anomalies`);
    return this.service.getSummary();
  }

  @Get()
  async getList(@Identity() admin: IIdentityContext, @Query() query: Record<string, string | string[] | undefined>) {
    await this.accessService.assertCapability(admin, `ledger.anomalies`);
    return this.service.getList({
      className: one(query.class) ?? ``,
      dateFrom: parseDate(one(query.dateFrom)),
      dateTo: parseDate(one(query.dateTo)),
      cursor: one(query.cursor),
      limit: toNumber(one(query.limit)),
    });
  }
}
