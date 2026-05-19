import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCookieAuth, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Expose, Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

import { type AdminV2EscalatePayoutBody } from '@remoola/api-types';

import { Identity, type IIdentityContext, RequestMeta, type RequestMeta as RequestMetaPayload } from '../../common';
import { optionalNumberQuery, optionalStringQuery } from '../../common/query-transforms';
import { AdminV2AccessService } from '../admin-v2-access.service';
import { ConfirmedVersionedMutationBody } from '../admin-v2-common.dto';
import { AdminV2PayoutsService } from './admin-v2-payouts.service';

class PayoutsListQuery {
  @Expose()
  @Transform(({ obj, key }) => optionalStringQuery((obj as Record<string, unknown>)[key]))
  @IsOptional()
  @IsString()
  cursor?: string;

  @Expose()
  @Transform(({ obj, key }) => optionalNumberQuery((obj as Record<string, unknown>)[key]))
  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number;
}

class EscalatePayoutBody extends ConfirmedVersionedMutationBody implements AdminV2EscalatePayoutBody {
  @Expose()
  @IsOptional()
  @IsString()
  reason?: string;
}

@ApiCookieAuth()
@ApiTags(`Admin v2: Payouts`)
@Throttle({ default: { limit: 500, ttl: 60000 } })
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
  async listPayouts(@Identity() admin: IIdentityContext, @Query() query: PayoutsListQuery) {
    await this.accessService.assertCapability(admin, `ledger.read`);
    return this.service.listPayouts({
      cursor: query.cursor,
      limit: query.limit,
    });
  }

  @Get(`:id`)
  @ApiParam({ name: `id`, format: `uuid`, description: `Payout id` })
  @ApiBadRequestResponse({ description: `Invalid payout id.` })
  async getPayoutCase(@Identity() admin: IIdentityContext, @Param(`id`, ParseUUIDPipe) id: string) {
    await this.accessService.assertCapability(admin, `ledger.read`);
    return this.service.getPayoutCase(id);
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
