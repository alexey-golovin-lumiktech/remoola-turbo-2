import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCookieAuth, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Expose, Transform } from 'class-transformer';
import { IsDate, IsNumber, IsOptional, IsString, Min } from 'class-validator';

import { Identity, type IIdentityContext } from '../../common';
import { AdminV2AccessService } from '../admin-v2-access.service';
import { optionalDateQuery, optionalNumberQuery, optionalStringQuery } from '../admin-v2-query-transforms';
import { AdminV2LedgerService } from './admin-v2-ledger.service';

class LedgerEntriesQuery {
  @Expose()
  @Transform(({ obj, key }) => optionalStringQuery((obj as Record<string, unknown>)[key]))
  @IsString()
  @IsOptional()
  cursor?: string;

  @Expose()
  @Transform(({ obj, key }) => optionalNumberQuery((obj as Record<string, unknown>)[key]))
  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number;

  @Expose()
  @Transform(({ obj, key }) => optionalStringQuery((obj as Record<string, unknown>)[key]))
  @IsString()
  @IsOptional()
  q?: string;

  @Expose()
  @Transform(({ obj, key }) => optionalStringQuery((obj as Record<string, unknown>)[key]))
  @IsString()
  @IsOptional()
  type?: string;

  @Expose()
  @Transform(({ obj, key }) => optionalStringQuery((obj as Record<string, unknown>)[key]))
  @IsString()
  @IsOptional()
  status?: string;

  @Expose()
  @Transform(({ obj, key }) => optionalStringQuery((obj as Record<string, unknown>)[key]))
  @IsString()
  @IsOptional()
  currencyCode?: string;

  @Expose()
  @Transform(({ obj, key }) => optionalStringQuery((obj as Record<string, unknown>)[key]))
  @IsString()
  @IsOptional()
  paymentRequestId?: string;

  @Expose()
  @Transform(({ obj, key }) => optionalStringQuery((obj as Record<string, unknown>)[key]))
  @IsString()
  @IsOptional()
  consumerId?: string;

  @Expose()
  @Transform(({ obj, key }) => optionalStringQuery((obj as Record<string, unknown>)[key]))
  @IsString()
  @IsOptional()
  amountSign?: string;

  @Expose()
  @Transform(({ obj, key }) => optionalDateQuery((obj as Record<string, unknown>)[key]))
  @IsOptional()
  @IsDate()
  dateFrom?: Date;

  @Expose()
  @Transform(({ obj, key }) => optionalDateQuery((obj as Record<string, unknown>)[key]))
  @IsOptional()
  @IsDate()
  dateTo?: Date;
}

class LedgerDisputesQuery {
  @Expose()
  @Transform(({ obj, key }) => optionalStringQuery((obj as Record<string, unknown>)[key]))
  @IsString()
  @IsOptional()
  cursor?: string;

  @Expose()
  @Transform(({ obj, key }) => optionalNumberQuery((obj as Record<string, unknown>)[key]))
  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number;

  @Expose()
  @Transform(({ obj, key }) => optionalStringQuery((obj as Record<string, unknown>)[key]))
  @IsString()
  @IsOptional()
  paymentRequestId?: string;

  @Expose()
  @Transform(({ obj, key }) => optionalStringQuery((obj as Record<string, unknown>)[key]))
  @IsString()
  @IsOptional()
  consumerId?: string;

  @Expose()
  @Transform(({ obj, key }) => optionalStringQuery((obj as Record<string, unknown>)[key]))
  @IsString()
  @IsOptional()
  q?: string;

  @Expose()
  @Transform(({ obj, key }) => optionalDateQuery((obj as Record<string, unknown>)[key]))
  @IsOptional()
  @IsDate()
  dateFrom?: Date;

  @Expose()
  @Transform(({ obj, key }) => optionalDateQuery((obj as Record<string, unknown>)[key]))
  @IsOptional()
  @IsDate()
  dateTo?: Date;
}

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
  @ApiQuery({ name: `cursor`, required: false })
  @ApiQuery({ name: `limit`, required: false, type: Number })
  @ApiQuery({ name: `q`, required: false })
  @ApiQuery({ name: `type`, required: false })
  @ApiQuery({ name: `status`, required: false })
  @ApiQuery({ name: `currencyCode`, required: false })
  @ApiQuery({ name: `paymentRequestId`, required: false })
  @ApiQuery({ name: `consumerId`, required: false })
  @ApiQuery({ name: `amountSign`, required: false })
  @ApiQuery({ name: `dateFrom`, required: false })
  @ApiQuery({ name: `dateTo`, required: false })
  @ApiBadRequestResponse({ description: `Invalid query parameter shape or type.` })
  async listLedgerEntries(@Identity() admin: IIdentityContext, @Query() query: LedgerEntriesQuery) {
    await this.accessService.assertCapability(admin, `ledger.read`);
    return this.service.listLedgerEntries(query);
  }

  @Get(`disputes`)
  @ApiQuery({ name: `cursor`, required: false })
  @ApiQuery({ name: `limit`, required: false, type: Number })
  @ApiQuery({ name: `paymentRequestId`, required: false })
  @ApiQuery({ name: `consumerId`, required: false })
  @ApiQuery({ name: `q`, required: false })
  @ApiQuery({ name: `dateFrom`, required: false })
  @ApiQuery({ name: `dateTo`, required: false })
  @ApiBadRequestResponse({ description: `Invalid query parameter shape or type.` })
  async listDisputes(@Identity() admin: IIdentityContext, @Query() query: LedgerDisputesQuery) {
    await this.accessService.assertCapability(admin, `ledger.read`);
    return this.service.listDisputes(query);
  }

  @Get(`:id`)
  @ApiParam({ name: `id`, format: `uuid`, description: `Ledger entry id` })
  @ApiBadRequestResponse({ description: `Invalid ledger entry id.` })
  async getLedgerEntryCase(@Identity() admin: IIdentityContext, @Param(`id`, ParseUUIDPipe) id: string) {
    await this.accessService.assertCapability(admin, `ledger.read`);
    return this.service.getLedgerEntryCase(id);
  }
}
