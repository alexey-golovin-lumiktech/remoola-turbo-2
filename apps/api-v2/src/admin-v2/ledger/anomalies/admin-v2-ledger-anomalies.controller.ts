import { Controller, Get, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCookieAuth, ApiQuery, ApiTags } from '@nestjs/swagger';

import { LedgerAnomaliesListQuery } from './admin-v2-ledger-anomalies.dto';
import { AdminV2LedgerAnomaliesService } from './admin-v2-ledger-anomalies.service';
import { AdminV2ReadThrottle, Identity, type IIdentityContext, PlainObjectResponseContract } from '../../../common';
import { AdminV2AccessService } from '../../admin-v2-access.service';

@ApiCookieAuth()
@ApiTags(`Admin v2: Ledger anomalies`)
@PlainObjectResponseContract(
  `Admin v2 ledger anomaly routes return plain objects governed by @remoola/api-types contracts.`,
)
@AdminV2ReadThrottle()
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
