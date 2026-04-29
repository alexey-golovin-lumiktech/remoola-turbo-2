import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Expose, Transform, Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

import { JwtAuthGuard } from '../../auth/jwt.guard';
import { Identity, type IIdentityContext } from '../../common';
import { AdminV2AccessService } from '../admin-v2-access.service';
import { AdminV2LedgerService } from './admin-v2-ledger.service';

function transformDate(value: unknown): Date | undefined {
  if (typeof value !== `string` || value.trim().length === 0) {
    return undefined;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

class LedgerEntriesQuery {
  @Expose()
  @IsString()
  @IsOptional()
  cursor?: string;

  @Expose()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number;

  @Expose()
  @IsString()
  @IsOptional()
  q?: string;

  @Expose()
  @IsString()
  @IsOptional()
  type?: string;

  @Expose()
  @IsString()
  @IsOptional()
  status?: string;

  @Expose()
  @IsString()
  @IsOptional()
  currencyCode?: string;

  @Expose()
  @IsString()
  @IsOptional()
  paymentRequestId?: string;

  @Expose()
  @IsString()
  @IsOptional()
  consumerId?: string;

  @Expose()
  @IsString()
  @IsOptional()
  amountSign?: string;

  @Expose()
  @Transform(({ value }) => transformDate(value))
  @IsOptional()
  dateFrom?: Date;

  @Expose()
  @Transform(({ value }) => transformDate(value))
  @IsOptional()
  dateTo?: Date;
}

class LedgerDisputesQuery {
  @Expose()
  @IsString()
  @IsOptional()
  cursor?: string;

  @Expose()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number;

  @Expose()
  @IsString()
  @IsOptional()
  paymentRequestId?: string;

  @Expose()
  @IsString()
  @IsOptional()
  consumerId?: string;

  @Expose()
  @IsString()
  @IsOptional()
  q?: string;

  @Expose()
  @Transform(({ value }) => transformDate(value))
  @IsOptional()
  dateFrom?: Date;

  @Expose()
  @Transform(({ value }) => transformDate(value))
  @IsOptional()
  dateTo?: Date;
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
  async listLedgerEntries(@Identity() admin: IIdentityContext, @Query() query: LedgerEntriesQuery) {
    await this.accessService.assertCapability(admin, `ledger.read`);
    return this.service.listLedgerEntries(query);
  }

  @Get(`disputes`)
  async listDisputes(@Identity() admin: IIdentityContext, @Query() query: LedgerDisputesQuery) {
    await this.accessService.assertCapability(admin, `ledger.read`);
    return this.service.listDisputes(query);
  }

  @Get(`:id`)
  async getLedgerEntryCase(@Identity() admin: IIdentityContext, @Param(`id`) id: string) {
    await this.accessService.assertCapability(admin, `ledger.read`);
    return this.service.getLedgerEntryCase(id);
  }
}
