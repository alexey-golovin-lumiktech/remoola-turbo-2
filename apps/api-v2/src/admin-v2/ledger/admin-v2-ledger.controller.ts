import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCookieAuth, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

import { AdminV2ReadThrottle, Identity, type IIdentityContext, PlainObjectResponseContract } from '../../common';
import { AdminV2AccessService } from '../admin-v2-access.service';
import { LedgerDisputesQuery, LedgerEntriesQuery } from './admin-v2-ledger.dto';
import { AdminV2LedgerService } from './admin-v2-ledger.service';

@ApiCookieAuth()
@ApiTags(`Admin v2: Ledger`)
@PlainObjectResponseContract(`Admin v2 ledger routes return plain objects governed by @remoola/api-types contracts.`)
@AdminV2ReadThrottle()
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
