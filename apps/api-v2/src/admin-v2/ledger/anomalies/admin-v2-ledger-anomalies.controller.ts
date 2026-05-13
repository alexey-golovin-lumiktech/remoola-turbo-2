import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCookieAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Expose, Transform } from 'class-transformer';
import { IsDate, IsNumber, IsOptional, IsString, Min } from 'class-validator';

import { AdminV2LedgerAnomaliesService } from './admin-v2-ledger-anomalies.service';
import { JwtAuthGuard } from '../../../auth/jwt.guard';
import { Identity, type IIdentityContext } from '../../../common';
import { AdminV2AccessService } from '../../admin-v2-access.service';
import { optionalDateQuery, optionalNumberQuery, optionalStringQuery } from '../../admin-v2-query-transforms';

class LedgerAnomaliesListQuery {
  @Expose({ name: `class` })
  @Transform(({ obj }) => optionalStringQuery((obj as Record<string, unknown>)[`class`]))
  @IsString()
  className!: string;

  @Expose()
  @Transform(({ obj, key }) => optionalDateQuery((obj as Record<string, unknown>)[key]))
  @IsDate()
  dateFrom!: Date;

  @Expose()
  @Transform(({ obj, key }) => optionalDateQuery((obj as Record<string, unknown>)[key]))
  @IsDate()
  @IsOptional()
  dateTo?: Date;

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
  @ApiQuery({ name: `class`, required: true })
  @ApiQuery({ name: `dateFrom`, required: true })
  @ApiQuery({ name: `dateTo`, required: false })
  @ApiQuery({ name: `cursor`, required: false })
  @ApiQuery({ name: `limit`, required: false, type: Number })
  @ApiBadRequestResponse({ description: `Invalid query parameter shape or type.` })
  async getList(@Identity() admin: IIdentityContext, @Query() query: LedgerAnomaliesListQuery) {
    await this.accessService.assertCapability(admin, `ledger.anomalies`);
    return this.service.getList({
      className: query.className,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      cursor: query.cursor,
      limit: query.limit,
    });
  }
}
