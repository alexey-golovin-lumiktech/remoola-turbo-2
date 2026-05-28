import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCookieAuth, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

import {
  adminV2PayoutCaseResponseSchema,
  adminV2PayoutsListResponseSchema,
  type AdminV2PayoutCaseResponse,
  type AdminV2PayoutsListResponse,
} from '@remoola/api-types';

import {
  AdminV2ReadThrottle,
  Identity,
  type IIdentityContext,
  PlainObjectResponseContract,
  RequestMeta,
  type RequestMeta as RequestMetaPayload,
} from '../../common';
import { AdminV2AccessService } from '../admin-v2-access.service';
import { toAdminV2WireContract } from '../admin-v2-wire-contract';
import { EscalatePayoutBody, PayoutsListQuery } from './admin-v2-payouts.dto';
import { AdminV2PayoutsService } from './admin-v2-payouts.service';

@ApiCookieAuth()
@ApiTags(`Admin v2: Payouts`)
@PlainObjectResponseContract(`Admin v2 payout routes return plain objects governed by @remoola/api-types contracts.`)
@AdminV2ReadThrottle()
@Controller(`admin-v2/payouts`)
export class AdminV2PayoutsController {
  constructor(
    private readonly service: AdminV2PayoutsService,
    private readonly accessService: AdminV2AccessService,
  ) {}

  @Get()
  @ApiQuery({ name: `cursor`, required: false })
  @ApiQuery({ name: `limit`, required: false, type: Number })
  @ApiBadRequestResponse({ description: `Invalid query parameter shape or type.` })
  async listPayouts(
    @Identity() admin: IIdentityContext,
    @Query() query: PayoutsListQuery,
  ): Promise<AdminV2PayoutsListResponse> {
    await this.accessService.assertCapability(admin, `ledger.read`);
    return toAdminV2WireContract(
      adminV2PayoutsListResponseSchema,
      await this.service.listPayouts({
        cursor: query.cursor,
        limit: query.limit,
      }),
    );
  }

  @Get(`:id`)
  @ApiParam({ name: `id`, format: `uuid`, description: `Payout id` })
  @ApiBadRequestResponse({ description: `Invalid payout id.` })
  async getPayoutCase(
    @Identity() admin: IIdentityContext,
    @Param(`id`, ParseUUIDPipe) id: string,
  ): Promise<AdminV2PayoutCaseResponse> {
    await this.accessService.assertCapability(admin, `ledger.read`);
    return toAdminV2WireContract(adminV2PayoutCaseResponseSchema, await this.service.getPayoutCase(id));
  }

  @Post(`:id/escalate`)
  @ApiParam({ name: `id`, format: `uuid`, description: `Payout id` })
  @ApiBadRequestResponse({ description: `Invalid payout id or escalation body.` })
  async escalatePayout(
    @Identity() admin: IIdentityContext,
    @Param(`id`, ParseUUIDPipe) id: string,
    @Body() body: EscalatePayoutBody,
    @RequestMeta() meta: RequestMetaPayload,
  ) {
    await this.accessService.assertCapability(admin, `payouts.escalate`);
    return this.service.escalatePayout(id, admin.id, body, meta);
  }
}
