import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCookieAuth, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

import {
  adminV2LedgerDisputesResponseSchema,
  adminV2LedgerEntriesListResponseSchema,
  adminV2LedgerEntryCaseResponseSchema,
  type AdminV2LedgerDisputesResponse,
  type AdminV2LedgerEntriesListResponse,
  type AdminV2LedgerEntryCaseResponse,
} from '@remoola/api-types';

import { AdminV2ReadThrottle, Identity, type IIdentityContext, PlainObjectResponseContract } from '../../common';
import { AdminV2AccessService } from '../admin-v2-access.service';
import { toAdminV2WireContract } from '../admin-v2-wire-contract';
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
  async listLedgerEntries(
    @Identity() admin: IIdentityContext,
    @Query() query: LedgerEntriesQuery,
  ): Promise<AdminV2LedgerEntriesListResponse> {
    await this.accessService.assertCapability(admin, `ledger.read`);
    return toAdminV2WireContract(adminV2LedgerEntriesListResponseSchema, await this.service.listLedgerEntries(query));
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
  async listDisputes(
    @Identity() admin: IIdentityContext,
    @Query() query: LedgerDisputesQuery,
  ): Promise<AdminV2LedgerDisputesResponse> {
    await this.accessService.assertCapability(admin, `ledger.read`);
    return toAdminV2WireContract(adminV2LedgerDisputesResponseSchema, await this.service.listDisputes(query));
  }

  @Get(`:id`)
  @ApiParam({ name: `id`, format: `uuid`, description: `Ledger entry id` })
  @ApiBadRequestResponse({ description: `Invalid ledger entry id.` })
  async getLedgerEntryCase(
    @Identity() admin: IIdentityContext,
    @Param(`id`, ParseUUIDPipe) id: string,
  ): Promise<AdminV2LedgerEntryCaseResponse> {
    await this.accessService.assertCapability(admin, `ledger.read`);
    return toAdminV2WireContract(adminV2LedgerEntryCaseResponseSchema, await this.service.getLedgerEntryCase(id));
  }
}
