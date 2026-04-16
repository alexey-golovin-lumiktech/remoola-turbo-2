import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';

import { type AdminModel } from '@remoola/database-2';

import { JwtAuthGuard } from '../../auth/jwt.guard';
import { Identity } from '../../common';
import { assertAdminV2Capability } from '../admin-v2-access';
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
@Controller(`admin-v2/ledger`)
export class AdminV2LedgerController {
  constructor(private readonly service: AdminV2LedgerService) {}

  @Get()
  listLedgerEntries(@Identity() admin: AdminModel, @Query() query: Record<string, string | string[] | undefined>) {
    assertAdminV2Capability(admin, `ledger.read`);
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
  listDisputes(@Identity() admin: AdminModel, @Query() query: Record<string, string | string[] | undefined>) {
    assertAdminV2Capability(admin, `ledger.read`);
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
  getLedgerEntryCase(@Identity() admin: AdminModel, @Param(`id`) id: string) {
    assertAdminV2Capability(admin, `ledger.read`);
    return this.service.getLedgerEntryCase(id);
  }
}
